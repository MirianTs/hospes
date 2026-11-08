// 4 servo locks on an Arduino Uno, driven from a web page over USB (Web Serial).
//
// Serial 9600 baud. Commands (one character, newline optional):
//   '1'..'4'  open that lock; it locks again by itself after OPEN_MS
//   '?'       print the state of all locks
// Replies (one per line): READY, OPEN <n>, CLOSED <n>
//
// Wiring: servo signal (orange/yellow) -> D3, D5, D6, D9
//         servo red -> breadboard + rail -> Uno 5V
//         servo brown -> breadboard - rail -> Uno GND
//
// Powered from USB only, so only one servo moves at a time and every servo is
// let go (detached) once it reaches its angle. That keeps the current low enough
// that the Uno doesn't reset.
#include <Servo.h>

const uint8_t LOCKS = 4;
const uint8_t SERVO_PINS[LOCKS] = {3, 5, 6, 9};
// Per lock, so a servo mounted the other way can turn the other way.
// Locks 1 and 3: locked at 180°, open at 90° (the arm swings down). Lock 2 opens to the other side: 90° -> 180° (its arm is set on the spline at 90° = closed).
// Lock 4 (key return) turns the other way: locked at 0°, open at 90°.
const uint8_t LOCKED_ANGLE[LOCKS] = {180, 90, 180, 0};
const uint8_t OPEN_ANGLE[LOCKS] = {90, 180, 90, 90};
const unsigned long OPEN_MS = 5000;   // how long a lock stays open
const unsigned long SETTLE_MS = 600;  // time an SG90 needs to turn 90°

Servo servos[LOCKS];
bool isOpen[LOCKS];
unsigned long openedAt[LOCKS];
int16_t target[LOCKS];  // angle waiting to be applied, -1 = none

int8_t moving = -1;  // servo that is moving right now, -1 = none
unsigned long movedAt = 0;

void report(uint8_t i) {
  Serial.print(isOpen[i] ? F("OPEN ") : F("CLOSED "));
  Serial.println(i + 1);
}

// Start the next waiting move, but only when no servo is moving.
void runQueue() {
  unsigned long now = millis();
  if (moving >= 0) {
    if (now - movedAt < SETTLE_MS) return;
    servos[moving].detach();
    moving = -1;
  }
  for (uint8_t i = 0; i < LOCKS; i++) {
    if (target[i] < 0) continue;
    servos[i].write(target[i]);  // angle first, so attach() doesn't jump to 90°
    servos[i].attach(SERVO_PINS[i]);
    target[i] = -1;
    moving = i;
    movedAt = now;
    return;
  }
}

void openLock(uint8_t i) {
  openedAt[i] = millis();  // pressing an open lock again restarts its time
  if (!isOpen[i]) {
    isOpen[i] = true;
    target[i] = OPEN_ANGLE[i];
  }
  report(i);
}

void closeLock(uint8_t i) {
  isOpen[i] = false;
  target[i] = LOCKED_ANGLE[i];
  report(i);
}

void setup() {
  Serial.begin(9600);
  for (uint8_t i = 0; i < LOCKS; i++) {
    isOpen[i] = false;
    target[i] = LOCKED_ANGLE[i];  // move every servo to "locked" once, one by one
  }
  Serial.println(F("READY"));
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c >= '1' && c <= '4') {
      openLock(c - '1');
    } else if (c == '?') {
      for (uint8_t i = 0; i < LOCKS; i++) report(i);
    }
  }

  unsigned long now = millis();
  for (uint8_t i = 0; i < LOCKS; i++) {
    if (isOpen[i] && now - openedAt[i] >= OPEN_MS) closeLock(i);
  }

  runQueue();
}
