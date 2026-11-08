import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';
import { Alert, Spinner, useApi, VerificationBadge } from '../components/ui.jsx';

const MAX_SIDE = 1024;
const THRESHOLD = 0.6; // same default as FACE_MATCH_THRESHOLD on the server

// face-api (~1.3 MB) is fetched only when real comparison is on.
const faceLib = () => import('../face.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Distance -> "match" percentage: 50% at the threshold, close to 100% for clear matches.
function matchPercent(distance, threshold) {
  return Math.round(100 / (1 + Math.exp((distance - threshold) * 12)));
}

// Draws an image or video frame onto a canvas no larger than MAX_SIDE.
function toCanvas(source, width, height) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function fileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(toCanvas(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('სურათი ვერ წავიკითხე. სცადე JPEG ან PNG.'));
    };
    img.src = url;
  });
}

const canvasBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));

function Shot({ canvas, children }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    setSrc(canvas ? canvas.toDataURL('image/jpeg', 0.85) : null);
  }, [canvas]);
  return <div className={`shot${src ? ' filled' : ''}`}>{src ? <img src={src} alt="" /> : children}</div>;
}

function IdStep({ canvas, onChange, onError }) {
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onChange(await fileToCanvas(file));
    } catch (err) {
      onError(err.message);
    }
  };
  return (
    <div className="card card-body">
      <h3 className="card-title">1. პირადობის ფოტო</h3>
      <Shot canvas={canvas}>
        <div className="hint">
          <Icon name="card" size={34} />
          პირადობის მოწმობა ან პასპორტი: ფოტოს მხარე, კარგ განათებაში
        </div>
      </Shot>
      <label className="btn btn-outline btn-block mt-2">
        <Icon name="upload" size={16} /> {canvas ? 'სხვა ფოტოს არჩევა' : 'ფოტოს ატვირთვა / გადაღება'}
        <input type="file" accept="image/*" capture="environment" onChange={pick} hidden />
      </label>
    </div>
  );
}

function SelfieStep({ canvas, onChange, onError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [live, setLive] = useState(false);
  const canUseCamera = Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  };
  useEffect(() => stop, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      setLive(true);
      onChange(null);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      onError('კამერაზე წვდომა ვერ მოხერხდა. დაუშვი კამერა ბრაუზერში ან ატვირთე სელფი ფაილად.');
    }
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    onChange(toCanvas(v, v.videoWidth, v.videoHeight));
    stop();
  };

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onChange(await fileToCanvas(file));
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <div className="card card-body">
      <h3 className="card-title">2. სელფი</h3>
      {live ? (
        <div className="shot filled">
          <video ref={videoRef} className="mirror" playsInline muted />
        </div>
      ) : (
        <Shot canvas={canvas}>
          <div className="hint">
            <Icon name="camera" size={34} />
            სახე კადრის ცენტრში, სათვალისა და ქუდის გარეშე
          </div>
        </Shot>
      )}
      <div className="inline mt-2">
        {live ? (
          <>
            <button type="button" className="btn btn-primary" onClick={capture}>
              <Icon name="camera" size={16} /> გადაღება
            </button>
            <button type="button" className="btn btn-ghost" onClick={stop}>
              გაუქმება
            </button>
          </>
        ) : (
          <>
            {canUseCamera && (
              <button type="button" className="btn btn-outline" onClick={start}>
                <Icon name="camera" size={16} /> {canvas ? 'ხელახლა გადაღება' : 'კამერის ჩართვა'}
              </button>
            )}
            <label className={`btn ${canUseCamera ? 'btn-ghost' : 'btn-outline'}`}>
              <Icon name="upload" size={16} /> {canUseCamera ? 'ფაილიდან' : 'სელფის გადაღება'}
              <input type="file" accept="image/*" capture="user" onChange={pick} hidden />
            </label>
          </>
        )}
      </div>
    </div>
  );
}

export default function Verify() {
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next')?.startsWith('/') && !params.get('next').startsWith('//') ? params.get('next') : null;
  const [idCanvas, setIdCanvas] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | models | faces | upload | done
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const config = useApi('/config');
  const mode = config.data?.face_verification; // 'demo' | 'real'
  const threshold = config.data?.face_match_threshold ?? THRESHOLD;

  // Real mode: start downloading the models while the guest takes the photos.
  useEffect(() => {
    if (mode === 'real') faceLib().then((f) => f.loadModels()).catch(() => {});
  }, [mode]);

  const save = async (form) => {
    setPhase('upload');
    const res = await api('/auth/verify', { method: 'POST', form });
    setUser(res.user);
    setResult(res);
    setPhase('done');
  };

  // Demo mode: the same steps on screen, but the match is not computed and photos are not sent.
  const demoCompare = async () => {
    setPhase('faces');
    await sleep(1500);
    const form = new FormData();
    form.append('distance', (0.22 + Math.random() * 0.12).toFixed(4));
    await save(form);
  };

  const realCompare = async () => {
    setPhase('models');
    const { describeFace, faceDistance, loadModels } = await faceLib();
    await loadModels();
    setPhase('faces');
    const a = await describeFace(idCanvas);
    if (!a) throw new Error('პირადობის ფოტოზე სახე ვერ მოიძებნა. გადაიღე უფრო ახლოდან და კარგ განათებაში.');
    const b = await describeFace(selfie);
    if (!b) throw new Error('სელფიზე სახე ვერ მოიძებნა. სახე კადრის ცენტრში მოაქციე.');
    const distance = faceDistance(a.descriptor, b.descriptor);
    const form = new FormData();
    form.append('id_doc', await canvasBlob(idCanvas), 'id.jpg');
    form.append('selfie', await canvasBlob(selfie), 'selfie.jpg');
    form.append('distance', distance.toFixed(4));
    await save(form);
  };

  const compare = async () => {
    setError(null);
    setResult(null);
    try {
      await (mode === 'real' ? realCompare() : demoCompare());
    } catch (e) {
      setError(e.message || 'შედარება ვერ მოხერხდა');
      setPhase('idle');
    }
  };

  const busy = ['models', 'faces', 'upload'].includes(phase);
  const phaseText = { models: 'მოდელები იტვირთება…', faces: 'სახეებს ვადარებ…', upload: 'შედეგს ვინახავ…' }[phase];
  const match = result ? matchPercent(result.distance, result.threshold ?? threshold) : 0;

  return (
    <div className="container">
      <div className="page-head">
        <div className="inline">
          <h1 className="mb-0">ვინაობის დადასტურება</h1>
          <VerificationBadge status={user.verification_status} />
        </div>
        <p className="mt-1">
          ჩექინამდე ჯერ ვინაობა უნდა დაადასტურო. სახეებს შენი ბრაუზერი ადარებს, სერვერზე მხოლოდ შედეგი და
          ფოტოები ინახება.
        </p>
      </div>

      {user.verification_status === 'verified' && !result && (
        <Alert tone="success">
          უკვე ვერიფიცირებული ხარ. <Link to={next || '/cabinet'}>გაგრძელება →</Link>
        </Alert>
      )}

      <div className="verify-grid mt-2">
        <IdStep canvas={idCanvas} onChange={setIdCanvas} onError={setError} />
        <SelfieStep canvas={selfie} onChange={setSelfie} onError={setError} />
      </div>

      <div className="card card-body mt-3" style={{ maxWidth: 640 }}>
        <h3 className="card-title">3. შედარება</h3>
        {error && <Alert tone="error">{error}</Alert>}
        {result && (
          <div className="stack">
            <Alert tone={result.verified ? 'success' : 'error'}>
              {result.verified
                ? 'ვინაობა დადასტურდა! ახლა ჩექინი და ლოქერ-ბოქსის გახსნა შეგიძლია.'
                : 'სახეები საკმარისად არ დაემთხვა. სცადე უკეთეს განათებაში, ან პირადობის ფოტო უფრო ახლოდან გადაიღე.'}
            </Alert>
            <div>
              <div className="spread small">
                <span>დამთხვევა</span>
                <strong>{match}%</strong>
              </div>
              <div className="meter mt-1">
                <div style={{ width: `${match}%`, background: result.verified ? 'var(--vine)' : 'var(--danger)' }} />
              </div>
              <div className="muted small mt-1">
                სახეებს შორის მანძილი {result.distance.toFixed(2)} (ზღვარი {result.threshold ?? threshold})
              </div>
            </div>
          </div>
        )}
        <div className="inline mt-2">
          {result?.verified ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate(next || '/cabinet')}>
              გაგრძელება <Icon name="arrowRight" size={16} />
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" disabled={!idCanvas || !selfie || busy || !mode} onClick={compare}>
              {busy ? <Spinner small /> : <Icon name="shield" size={16} />} {busy ? phaseText : 'შედარება და დადასტურება'}
            </button>
          )}
          {!result && (!idCanvas || !selfie) ? <span className="muted small">ჯერ ორივე ფოტო დაამატე.</span> : null}
        </div>
        {mode === 'demo' && !result?.verified && (
          <button type="button" className="btn btn-ghost btn-sm mt-2" disabled={busy} onClick={compare}>
            ფოტოების გარეშე გაგრძელება
          </button>
        )}
      </div>
    </div>
  );
}
