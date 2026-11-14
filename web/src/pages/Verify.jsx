import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { safeNext, useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';
import { Alert, Spinner, useApi, VerificationBadge } from '../components/ui.jsx';
import { L } from '../prefs.js';

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
      reject(new Error(L('სურათი ვერ წავიკითხე. სცადე JPEG ან PNG.', "Couldn't read the image. Try a JPEG or PNG.")));
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
      <h3 className="card-title">{L('1. პირადობის ფოტო', '1. ID photo')}</h3>
      <Shot canvas={canvas}>
        <div className="hint">
          <Icon name="card" size={34} />
          {L('პირადობის მოწმობა ან პასპორტი: ფოტოს მხარე, კარგ განათებაში', 'ID card or passport: the photo side, in good light')}
        </div>
      </Shot>
      <label className="btn btn-outline btn-block mt-2">
        <Icon name="upload" size={16} /> {canvas ? L('სხვა ფოტოს არჩევა', 'Choose another photo') : L('ფოტოს ატვირთვა / გადაღება', 'Upload / take a photo')}
        <input type="file" accept="image/*" capture="environment" onChange={pick} hidden />
      </label>
    </div>
  );
}

function SelfieStep({ canvas, onChange, onError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [live, setLive] = useState(false);
  const mounted = useRef(true);
  const canUseCamera = Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false });
      // The guest may have left the page while the permission prompt was open: don't leave the camera on.
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
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
      onError(
        L(
          'კამერაზე წვდომა ვერ მოხერხდა. დაუშვი კამერა ბრაუზერში ან ატვირთე სელფი ფაილად.',
          "Couldn't access the camera. Allow camera access in your browser or upload a selfie as a file."
        )
      );
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
      <h3 className="card-title">{L('2. სელფი', '2. Selfie')}</h3>
      {live ? (
        <div className="shot filled">
          <video ref={videoRef} className="mirror" playsInline muted />
        </div>
      ) : (
        <Shot canvas={canvas}>
          <div className="hint">
            <Icon name="camera" size={34} />
            {L('სახე კადრის ცენტრში, სათვალისა და ქუდის გარეშე', 'Face in the center of the frame, no glasses or hat')}
          </div>
        </Shot>
      )}
      <div className="inline mt-2">
        {live ? (
          <>
            <button type="button" className="btn btn-primary" onClick={capture}>
              <Icon name="camera" size={16} /> {L('გადაღება', 'Capture')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={stop}>
              {L('გაუქმება', 'Cancel')}
            </button>
          </>
        ) : (
          <>
            {canUseCamera && (
              <button type="button" className="btn btn-outline" onClick={start}>
                <Icon name="camera" size={16} /> {canvas ? L('ხელახლა გადაღება', 'Retake') : L('კამერის ჩართვა', 'Turn on camera')}
              </button>
            )}
            <label className={`btn ${canUseCamera ? 'btn-ghost' : 'btn-outline'}`}>
              <Icon name="upload" size={16} /> {canUseCamera ? L('ფაილიდან', 'From file') : L('სელფის გადაღება', 'Take a selfie')}
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
  const next = safeNext(params.get('next'));
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
    if (!a) throw new Error(
        L(
          'პირადობის ფოტოზე სახე ვერ მოიძებნა. გადაიღე უფრო ახლოდან და კარგ განათებაში.',
          'No face found on the ID photo. Take it closer and in good light.'
        )
      );
    const b = await describeFace(selfie);
    if (!b)
      throw new Error(
        L('სელფიზე სახე ვერ მოიძებნა. სახე კადრის ცენტრში მოაქციე.', 'No face found on the selfie. Keep your face in the center of the frame.')
      );
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
      setError(e.message || L('შედარება ვერ მოხერხდა', 'Comparison failed'));
      setPhase('idle');
    }
  };

  const busy = ['models', 'faces', 'upload'].includes(phase);
  const phaseText = {
    models: L('მოდელები იტვირთება…', 'Loading models…'),
    faces: L('სახეებს ვადარებ…', 'Comparing faces…'),
    upload: L('შედეგს ვინახავ…', 'Saving the result…'),
  }[phase];
  const match = result ? matchPercent(result.distance, result.threshold ?? threshold) : 0;

  return (
    <div className="container">
      <div className="page-head">
        <div className="inline">
          <h1 className="mb-0">{L('ვინაობის დადასტურება', 'Identity verification')}</h1>
          <VerificationBadge status={user.verification_status} />
        </div>
        <p className="mt-1">
          {L(
            'ჩექინამდე ჯერ ვინაობა უნდა დაადასტურო. სახეებს შენი ბრაუზერი ადარებს, სერვერზე მხოლოდ შედეგი და ფოტოები ინახება.',
            'Before check-in you need to verify your identity. Your browser compares the faces; only the result and the photos are stored on the server.'
          )}
        </p>
      </div>

      {user.verification_status === 'verified' && !result && (
        <Alert tone="success">
          {L('უკვე ვერიფიცირებული ხარ.', "You're already verified.")} <Link to={next || '/cabinet'}>{L('გაგრძელება →', 'Continue →')}</Link>
        </Alert>
      )}

      <div className="verify-grid mt-2">
        <IdStep canvas={idCanvas} onChange={setIdCanvas} onError={setError} />
        <SelfieStep canvas={selfie} onChange={setSelfie} onError={setError} />
      </div>

      <div className="card card-body mt-3" style={{ maxWidth: 640 }}>
        <h3 className="card-title">{L('3. შედარება', '3. Comparison')}</h3>
        {error && <Alert tone="error">{error}</Alert>}
        {result && (
          <div className="stack">
            <Alert tone={result.verified ? 'success' : 'error'}>
              {result.verified
                ? L(
                    'ვინაობა დადასტურდა! ახლა ჩექინი და ლოქერ-ბოქსის გახსნა შეგიძლია.',
                    'Identity verified! You can now check in and open the locker box.'
                  )
                : L(
                    'სახეები საკმარისად არ დაემთხვა. სცადე უკეთეს განათებაში, ან პირადობის ფოტო უფრო ახლოდან გადაიღე.',
                    "The faces didn't match closely enough. Try in better light, or take the ID photo from closer."
                  )}
            </Alert>
            <div>
              <div className="spread small">
                <span>{L('დამთხვევა', 'Match')}</span>
                <strong>{match}%</strong>
              </div>
              <div className="meter mt-1">
                <div style={{ width: `${match}%`, background: result.verified ? 'var(--vine)' : 'var(--danger)' }} />
              </div>
              <div className="muted small mt-1">
                {L(
                  `სახეებს შორის მანძილი ${result.distance.toFixed(2)} (ზღვარი ${result.threshold ?? threshold})`,
                  `Face distance ${result.distance.toFixed(2)} (threshold ${result.threshold ?? threshold})`
                )}
              </div>
            </div>
          </div>
        )}
        <div className="inline mt-2">
          {result?.verified ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate(next || '/cabinet')}>
              {L('გაგრძელება', 'Continue')} <Icon name="arrowRight" size={16} />
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" disabled={!idCanvas || !selfie || busy || !mode} onClick={compare}>
              {busy ? <Spinner small /> : <Icon name="shield" size={16} />} {busy ? phaseText : L('შედარება და დადასტურება', 'Compare and verify')}
            </button>
          )}
          {!result && (!idCanvas || !selfie) ? <span className="muted small">{L('ჯერ ორივე ფოტო დაამატე.', 'Add both photos first.')}</span> : null}
        </div>
        {mode === 'demo' && !result?.verified && (
          <button type="button" className="btn btn-ghost btn-sm mt-2" disabled={busy} onClick={compare}>
            {L('ფოტოების გარეშე გაგრძელება', 'Continue without photos')}
          </button>
        )}
      </div>
    </div>
  );
}
