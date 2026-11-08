// Hospes: 4 door locks + an RC522 card reader on one Arduino Uno.
//
// Serial, 9600 baud, one command per line:
//   OPEN1 .. OPEN4   open that door; it locks again after OPEN_MS
//   CLOSE1 .. CLOSE4 lock right away
//   PING             answers PONG
// Replies: READY (after boot), RFID OK / ERR RFID ..., OPENED<n>, LOCKED<n>,
//          RFID:<UID hex> when a card is tapped, ERR ...
// The board never opens a door by itself for a card: the server decides and sends OPEN<n>.
//
// Wiring
//   Servos (signal): D3 = lock 1, D5 = lock 2, D6 = lock 3, D7 = lock 4
//   RC522: SDA -> D10, SCK -> D13, MOSI -> D11, MISO -> D12, RST -> D9,
//          GND -> GND, 3.3V -> 3.3V (never 5V), IRQ not connected
// One SG90 can run from the Uno's 5V pin; for 2-4 servos use an external
// 5V / 2A+ supply with its GND tied to the Uno's GND.
#include <SPI.h>
#include <MFRC522.h>
#include <Servo.h>

const uint8_t LOCKS = 4;
const uint8_t SERVO_PINS[LOCKS] = {3, 5, 6, 7};
// Tune per door if an arm over- or under-rotates.
// Locks 1 and 3: locked at 180°, open at 90° (the arm swings down). Locks 2 and 4: 0° -> 90°.
const uint8_t LOCKED_ANGLE[LOCKS] = {180, 0, 180, 0};
const uint8_t OPEN_ANGLE[LOCKS] = {90, 90, 90, 90};
const unsigned long OPEN_MS = 5000;
// After a move the servo is let go (no pulses), so a servo pushing against its latch
// doesn't keep drawing current and pull the reader's supply down. The latch stays put
// by friction. Set to false to keep the servos holding their position.
const bool RELEASE_SERVOS = true;
const unsigned long SETTLE_MS = 700;  // time an SG90 needs to reach its angle

const uint8_t RFID_SS_PIN = 10;
const uint8_t RFID_RST_PIN = 9;
const unsigned long SAME_CARD_MS = 2000;  // ignore the same card held on the reader

Servo servos[LOCKS];
bool isOpen[LOCKS];
unsigned long openedAt[LOCKS];
unsigned long releaseAt[LOCKS];  // 0 = nothing scheduled

MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
bool rfidReady = false;
bool rfidErrorShown = false;
bool antennaOk = true;
unsigned long rfidCheckedAt = 0;
unsigned long reinitAt = 0;         // restart the reader shortly after a servo moved
unsigned long readErrorShownAt = 0;
char lastUid[21] = "";
unsigned long lastUidAt = 0;

// A moving servo can pull the 5V (and so the reader's 3.3V) down for a moment;
// the RC522 then resets with its antenna off. Restart it once the servo has settled.
void restartReaderSoon() {
  reinitAt = millis() + SETTLE_MS + 100;
}

void moveServo(uint8_t i, uint8_t angle) {
  servos[i].write(angle);  // angle first, so attach() doesn't swing through 90°
  if (!servos[i].attached()) servos[i].attach(SERVO_PINS[i]);
  releaseAt[i] = RELEASE_SERVOS ? millis() + SETTLE_MS : 0;
}

void startReader() {
  rfid.PCD_Init();
  delay(10);
  rfid.PCD_SetAntennaGain(MFRC522::RxGain_max);
}

char line[16];
uint8_t len = 0;
bool overflow = false;

void lockDoor(uint8_t i) {
  moveServo(i, LOCKED_ANGLE[i]);
  isOpen[i] = false;
  restartReaderSoon();
  Serial.print(F("LOCKED"));
  Serial.println(i + 1);
}

void openDoor(uint8_t i) {
  moveServo(i, OPEN_ANGLE[i]);
  isOpen[i] = true;
  openedAt[i] = millis();
  restartReaderSoon();
  Serial.print(F("OPENED"));
  Serial.println(i + 1);
}

// "OPEN" + "3" -> index 2, or -1 when the command does not match.
int doorIndex(const char *cmd, const char *prefix) {
  size_t n = strlen(prefix);
  if (strncmp(cmd, prefix, n) != 0) return -1;
  char d = cmd[n];
  if (d < '1' || d > '0' + LOCKS || cmd[n + 1] != '\0') return -1;
  return d - '1';
}

void printReg(const __FlashStringHelper *name, MFRC522::PCD_Register reg) {
  Serial.print(name);
  Serial.print(F("=0x"));
  Serial.print(rfid.PCD_ReadRegister(reg), HEX);
  Serial.print(' ');
}

// RFIDDIAG: register dump for wiring/power problems. After a reset the chip
// shows its defaults again (ModeReg 0x3F, TxControlReg 0x80); PCD_Init sets ModeReg 0x3D.
void diagnoseReader() {
  Serial.print(F("DIAG "));
  printReg(F("Version"), MFRC522::VersionReg);
  printReg(F("Mode"), MFRC522::ModeReg);
  printReg(F("TxControl"), MFRC522::TxControlReg);
  printReg(F("TxASK"), MFRC522::TxASKReg);
  printReg(F("Command"), MFRC522::CommandReg);
  printReg(F("RFCfg"), MFRC522::RFCfgReg);
  Serial.println();
  rfid.PCD_AntennaOn();
  delay(5);
  Serial.print(F("DIAG antenna on, 5 ms later: "));
  printReg(F("TxControl"), MFRC522::TxControlReg);
  delay(300);
  Serial.print(F("300 ms later: "));
  printReg(F("TxControl"), MFRC522::TxControlReg);
  printReg(F("Mode"), MFRC522::ModeReg);
  Serial.println();
  uint8_t seen = 0;
  for (uint8_t n = 0; n < 20; n++) {
    if (rfid.PICC_IsNewCardPresent()) seen++;
    delay(50);
  }
  Serial.print(F("DIAG card answered "));
  Serial.print(seen);
  Serial.println(F(" of 20 polls"));
}

void handle(const char *cmd) {
  int i;
  if ((i = doorIndex(cmd, "OPEN")) >= 0) return openDoor(i);
  if ((i = doorIndex(cmd, "CLOSE")) >= 0) return lockDoor(i);
  if (strcmp(cmd, "PING") == 0) {
    Serial.println(F("PONG"));
    return;
  }
  if (strcmp(cmd, "RFIDDIAG") == 0) return diagnoseReader();
  Serial.print(F("ERR unknown command: "));
  Serial.println(cmd);
}

void readSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (len && !overflow) {
        line[len] = '\0';
        handle(line);
      } else if (overflow) {
        Serial.println(F("ERR line too long"));
      }
      len = 0;
      overflow = false;
    } else if (len < sizeof(line) - 1) {
      line[len++] = toupper(c);
    } else {
      overflow = true;  // drop the rest of this line
    }
  }
}

bool readerAnswers(byte &version) {
  version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  return version != 0x00 && version != 0xFF;
}

// Runs at boot and every 3 s after, so a reader wired (or unplugged) while the
// board is running is noticed without a reset, and one that reset itself
// (antenna off after a power dip) is started again.
void checkReader() {
  rfidCheckedAt = millis();
  byte version;
  if (!rfidReady) {
    startReader();
    if (!readerAnswers(version)) {
      if (!rfidErrorShown) Serial.println(F("ERR RFID reader not found: check SDA, SCK, MOSI, MISO, RST and 3.3V"));
      rfidErrorShown = true;
      return;
    }
    rfidReady = true;
    rfidErrorShown = false;
    Serial.print(F("RFID OK 0x"));
    Serial.println(version, HEX);
  } else if (!readerAnswers(version)) {
    rfidReady = false;
    rfidErrorShown = true;
    Serial.println(F("ERR RFID reader lost: check the wires"));
  } else if ((rfid.PCD_ReadRegister(MFRC522::TxControlReg) & 0x03) != 0x03) {
    // Turning the antenna on resets a reader whose 3.3V supply can't deliver the current.
    if (antennaOk) Serial.println(F("ERR RFID antenna keeps switching off: check the 3.3V and GND wires"));
    antennaOk = false;
    startReader();
  } else if (!antennaOk) {
    antennaOk = true;
    Serial.print(F("RFID OK 0x"));
    Serial.println(version, HEX);
  }
}

void readCard() {
  if (!rfidReady || !rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) {
    // The card answered but its ID could not be read: held too far, moved, or a weak reader.
    // Not an "ERR RFID" line: the server reads those as "reader missing".
    if (millis() - readErrorShownAt > 1000) Serial.println(F("RFID read failed: card seen, ID not read (hold it closer)"));
    readErrorShownAt = millis();
    return;
  }

  char uid[21];
  uint8_t n = min(rfid.uid.size, (byte)10);
  for (uint8_t i = 0; i < n; i++) sprintf(uid + i * 2, "%02X", rfid.uid.uidByte[i]);
  uid[n * 2] = '\0';
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  bool sameCard = strcmp(uid, lastUid) == 0 && millis() - lastUidAt < SAME_CARD_MS;
  lastUidAt = millis();
  if (sameCard) return;
  strcpy(lastUid, uid);
  Serial.print(F("RFID:"));
  Serial.println(uid);
}

void setup() {
  Serial.begin(9600);
  // Bytes picked up while the board resets would otherwise be glued to the first real line.
  Serial.println();
  for (uint8_t i = 0; i < LOCKS; i++) {
    moveServo(i, LOCKED_ANGLE[i]);
    isOpen[i] = false;
    delay(250);  // one servo at a time: several starting together pull the 5V (and the reader) down
  }
  SPI.begin();
  checkReader();
  Serial.println(F("READY"));
}

void loop() {
  readSerial();
  if (reinitAt && (long)(millis() - reinitAt) >= 0) {
    reinitAt = 0;
    if (rfidReady) startReader();
  }
  if (millis() - rfidCheckedAt >= 3000) checkReader();
  readCard();
  for (uint8_t i = 0; i < LOCKS; i++) {
    if (isOpen[i] && millis() - openedAt[i] >= OPEN_MS) lockDoor(i);
    if (releaseAt[i] && (long)(millis() - releaseAt[i]) >= 0) {
      servos[i].detach();
      releaseAt[i] = 0;
    }
  }
}
