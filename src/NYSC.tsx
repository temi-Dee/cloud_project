import { useState, useEffect, useRef, CSSProperties } from "react";

const STEPS = ["Profile", "Registration", "Lookup", "Biometrics"];

const nigerianStates = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"
];

const institutions = [
  "University of Lagos","Obafemi Awolowo University","University of Nigeria Nsukka",
  "Ahmadu Bello University","University of Ibadan","Nnamdi Azikiwe University",
  "Federal University of Technology Akure","Covenant University","Babcock University",
  "Lagos State University","University of Benin","Rivers State University",
  "Bayero University Kano","Usman Dan Fodio University"
];

const securityQuestions = [
  "What is your mother's maiden name?",
  "What is the name of your first pet?",
  "What is your date of birth?",
  "What was the name of your primary school?",
  "What is your grandmother's maiden name?"
];

export default function NYSCRegistration() {
  useGlobalStyles();
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    securityQuestion: "", securityAnswer: "", registrationType: "fresh"
  });
  const [regData, setRegData] = useState({
    nin: "", captcha: "", captchaInput: ""
  });
  const [lookupData, setLookupData] = useState({
    institution: "", jambReg: "", state: "", course: ""
  });
  const [biometrics, setBiometrics] = useState({
    thumbprintLeft: false, thumbprintRight: false,
    faceCapture: false, scanningThumb: null, scanningFace: false
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [lookupSuccess, setLookupSuccess] = useState(false);
  const [complete, setComplete] = useState(false);
  const [captchaCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const faceRef = useRef(null);
  const [faceProgress, setFaceProgress] = useState(0);
  const [thumbProgress, setThumbProgress] = useState({ left: 0, right: 0 });

  const validate = () => {
    const e = {};
    if (currentStep === 0) {
      if (!profileData.firstName.trim()) e.firstName = "Required";
      if (!profileData.lastName.trim()) e.lastName = "Required";
      if (!profileData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Valid email required";
      if (!profileData.phone.match(/^0\d{10}$/)) e.phone = "Valid Nigerian number (11 digits)";
      if (!profileData.securityQuestion) e.securityQuestion = "Select a security question";
      if (!profileData.securityAnswer.trim()) e.securityAnswer = "Required";
    }
    if (currentStep === 1) {
      if (!regData.nin.match(/^\d{11}$/)) e.nin = "NIN must be 11 digits";
      if (regData.captchaInput.toUpperCase() !== captchaCode) e.captchaInput = "Incorrect CAPTCHA";
    }
    if (currentStep === 2) {
      if (!lookupData.institution) e.institution = "Select institution";
      if (!lookupData.jambReg.match(/^\d{8,10}[A-Z]{2}$/i)) e.jambReg = "Invalid JAMB number";
      if (!lookupData.state) e.state = "Select state";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    if (currentStep === 0) setEmailSent(true);
    if (currentStep === 2) setLookupSuccess(true);
    setCurrentStep(s => s + 1);
  };

  const simulateThumb = async (hand) => {
    setBiometrics(b => ({ ...b, scanningThumb: hand }));
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 60));
      setThumbProgress(p => ({ ...p, [hand]: i }));
    }
    setBiometrics(b => ({
      ...b, scanningThumb: null,
      [`thumbprint${hand.charAt(0).toUpperCase() + hand.slice(1)}`]: true
    }));
  };

  const simulateFace = async () => {
    setBiometrics(b => ({ ...b, scanningFace: true }));
    for (let i = 0; i <= 100; i += 2) {
      await new Promise(r => setTimeout(r, 50));
      setFaceProgress(i);
    }
    setBiometrics(b => ({ ...b, scanningFace: false, faceCapture: true }));
  };

  const handleFinish = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 2000));
    setSubmitting(false);
    setComplete(true);
  };

  const allBiometricsComplete = biometrics.thumbprintLeft && biometrics.thumbprintRight && biometrics.faceCapture;

  if (complete) {
    return (
      <div style={styles.page}>
        <Header />
        <div style={styles.successContainer}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.successTitle}>Registration Complete!</h2>
          <p style={styles.successText}>
            Your NYSC registration has been successfully submitted. A confirmation email has been sent to <strong>{profileData.email}</strong>.
          </p>
          <div style={styles.successCard}>
            <div style={styles.successRow}><span>Name:</span><span>{profileData.firstName} {profileData.lastName}</span></div>
            <div style={styles.successRow}><span>Institution:</span><span>{lookupData.institution}</span></div>
            <div style={styles.successRow}><span>JAMB No:</span><span>{lookupData.jambReg.toUpperCase()}</span></div>
            <div style={styles.successRow}><span>State of Origin:</span><span>{lookupData.state}</span></div>
            <div style={styles.successRow}><span>Status:</span><span style={{color:"#16a34a",fontWeight:700}}>Mobilised ✓</span></div>
          </div>
          <p style={{...styles.successText, fontSize:13, color:"#6b7280", marginTop:16}}>
            Please keep this information safe. You will be contacted with further instructions regarding your deployment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Header />
      <div style={styles.container}>
        {/* Stepper */}
        <div style={styles.stepper}>
          {STEPS.map((s, i) => (
            <div key={s} style={styles.stepItem}>
              <div style={{
                ...styles.stepCircle,
                background: i < currentStep ? "#16a34a" : i === currentStep ? "#008751" : "#d1d5db",
                color: i <= currentStep ? "#fff" : "#6b7280",
                boxShadow: i === currentStep ? "0 0 0 4px rgba(0,135,81,0.2)" : "none"
              }}>
                {i < currentStep ? "✓" : i + 1}
              </div>
              <span style={{
                ...styles.stepLabel,
                color: i === currentStep ? "#008751" : i < currentStep ? "#16a34a" : "#9ca3af",
                fontWeight: i === currentStep ? 700 : 500
              }}>{s}</span>
              {i < STEPS.length - 1 && (
                <div style={{
                  ...styles.stepLine,
                  background: i < currentStep ? "#16a34a" : "#e5e7eb"
                }} />
              )}
            </div>
          ))}
        </div>

        {/* STEP 0: Profile */}
        {currentStep === 0 && (
          <FormCard title="Create Your NYSC Profile" subtitle="Step 1 of 4 — Enter your personal details to begin registration">
            <div style={styles.radioGroup}>
              {["fresh","revalidation"].map(t => (
                <label key={t} style={{
                  ...styles.radioLabel,
                  background: profileData.registrationType === t ? "#f0fdf4" : "#f9fafb",
                  border: `2px solid ${profileData.registrationType === t ? "#008751" : "#e5e7eb"}`
                }}>
                  <input type="radio" name="type" value={t}
                    checked={profileData.registrationType === t}
                    onChange={e => setProfileData(p => ({ ...p, registrationType: e.target.value }))}
                    style={{ accentColor: "#008751" }} />
                  <div>
                    <div style={{ fontWeight: 700, color: "#111", textTransform:"capitalize" }}>{t === "fresh" ? "Fresh Registration" : "Revalidation"}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {t === "fresh" ? "First time registering for NYSC" : "Updating/correcting existing record"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div style={styles.formGrid}>
              <Field label="First Name *" error={errors.firstName}>
                <input style={inputStyle(errors.firstName)} placeholder="Enter first name"
                  value={profileData.firstName}
                  onChange={e => setProfileData(p => ({ ...p, firstName: e.target.value }))} />
              </Field>
              <Field label="Last Name *" error={errors.lastName}>
                <input style={inputStyle(errors.lastName)} placeholder="Enter last name"
                  value={profileData.lastName}
                  onChange={e => setProfileData(p => ({ ...p, lastName: e.target.value }))} />
              </Field>
            </div>
            <Field label="Email Address *" error={errors.email}>
              <input style={inputStyle(errors.email)} placeholder="e.g. example@gmail.com" type="email"
                value={profileData.email}
                onChange={e => setProfileData(p => ({ ...p, email: e.target.value }))} />
              <div style={styles.fieldNote}>⚠ A registration link will be sent to this email. Ensure it is valid and accessible.</div>
            </Field>
            <Field label="Phone Number *" error={errors.phone}>
              <input style={inputStyle(errors.phone)} placeholder="e.g. 08012345678"
                value={profileData.phone}
                onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))} />
            </Field>
            <Field label="Security Question *" error={errors.securityQuestion}>
              <select style={inputStyle(errors.securityQuestion)}
                value={profileData.securityQuestion}
                onChange={e => setProfileData(p => ({ ...p, securityQuestion: e.target.value }))}>
                <option value="">— Select a security question —</option>
                {securityQuestions.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </Field>
            <Field label="Security Answer *" error={errors.securityAnswer}>
              <input style={inputStyle(errors.securityAnswer)} placeholder="Your answer"
                value={profileData.securityAnswer}
                onChange={e => setProfileData(p => ({ ...p, securityAnswer: e.target.value }))} />
            </Field>
            <SubmitButton onClick={handleNext} loading={submitting} label="Submit & Send Profile Link" />
          </FormCard>
        )}

        {/* STEP 1: Registration with NIN & CAPTCHA */}
        {currentStep === 1 && (
          <FormCard title="Complete Your Registration" subtitle="Step 2 of 4 — Validate your identity with NIN and CAPTCHA">
            {emailSent && (
              <div style={styles.alertBanner}>
                <span style={{ fontSize: 20 }}>📧</span>
                <div>
                  <div style={{ fontWeight: 700 }}>Profile link sent!</div>
                  <div style={{ fontSize: 13 }}>A registration link has been sent to <strong>{profileData.email}</strong>. This form simulates clicking that link.</div>
                </div>
              </div>
            )}
            <div style={styles.credentialBox}>
              <div style={styles.credentialTitle}>Auto-generated Credentials</div>
              <div style={styles.credRow}><span>Username:</span><code>{profileData.email || "your.email@domain.com"}</code></div>
              <div style={styles.credRow}><span>Password:</span><code>NYSC{"_"}{profileData.lastName.toUpperCase() || "LASTNAME"}{"_"}2025</code></div>
              <div style={{ fontSize: 12, color: "#92400e", marginTop: 8 }}>⚠ Change your password on first login</div>
            </div>
            <Field label="National Identification Number (NIN) *" error={errors.nin}>
              <input style={inputStyle(errors.nin)} placeholder="Enter your 11-digit NIN" maxLength={11}
                value={regData.nin}
                onChange={e => setRegData(p => ({ ...p, nin: e.target.value.replace(/\D/g, "") }))} />
              <div style={styles.fieldNote}>Your NIN is used to validate your identity against the NIMC database.</div>
            </Field>
            <Field label="CAPTCHA Verification *" error={errors.captchaInput}>
              <div style={styles.captchaRow}>
                <div style={styles.captchaBox}>
                  {captchaCode.split("").map((c, i) => (
                    <span key={i} style={{
                      ...styles.captchaChar,
                      transform: `rotate(${(Math.random() * 20) - 10}deg) translateY(${(Math.random() * 6) - 3}px)`,
                      color: ["#1d4ed8","#dc2626","#16a34a","#d97706","#7c3aed","#0891b2"][i % 6]
                    }}>{c}</span>
                  ))}
                </div>
                <input style={{ ...inputStyle(errors.captchaInput), flex: 1, letterSpacing: 4, textTransform: "uppercase" }}
                  placeholder="Enter code above" maxLength={6}
                  value={regData.captchaInput}
                  onChange={e => setRegData(p => ({ ...p, captchaInput: e.target.value }))} />
              </div>
              <div style={styles.fieldNote}>CAPTCHA is case-insensitive. This helps prevent automated submissions.</div>
            </Field>
            <SubmitButton onClick={handleNext} loading={submitting} label="Validate & Continue" />
          </FormCard>
        )}

        {/* STEP 2: Lookup */}
        {currentStep === 2 && (
          <FormCard title="Institution Lookup" subtitle="Step 3 of 4 — Verify your mobilisation status from your institution">
            <div style={styles.lookupInfo}>
              <div style={{ fontSize: 20 }}>🔍</div>
              <div>
                <div style={{ fontWeight: 700, color: "#1e40af" }}>Mobilisation Verification</div>
                <div style={{ fontSize: 13, color: "#1e40af" }}>
                  This lookup checks whether your institution has submitted your name for NYSC mobilisation. Ensure your details match exactly as submitted.
                </div>
              </div>
            </div>
            <Field label="Name of Institution *" error={errors.institution}>
              <select style={inputStyle(errors.institution)}
                value={lookupData.institution}
                onChange={e => setLookupData(p => ({ ...p, institution: e.target.value }))}>
                <option value="">— Select your institution —</option>
                {institutions.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="JAMB Registration Number *" error={errors.jambReg}>
              <input style={inputStyle(errors.jambReg)} placeholder="e.g. 12345678AB"
                value={lookupData.jambReg}
                onChange={e => setLookupData(p => ({ ...p, jambReg: e.target.value.toUpperCase() }))} />
              <div style={styles.fieldNote}>Format: 8–10 digits followed by 2 letters (e.g., 87654321CD)</div>
            </Field>
            <div style={styles.formGrid}>
              <Field label="State of Origin *" error={errors.state}>
                <select style={inputStyle(errors.state)}
                  value={lookupData.state}
                  onChange={e => setLookupData(p => ({ ...p, state: e.target.value }))}>
                  <option value="">— Select state —</option>
                  {nigerianStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Course of Study">
                <input style={inputStyle(false)} placeholder="e.g. Computer Science"
                  value={lookupData.course}
                  onChange={e => setLookupData(p => ({ ...p, course: e.target.value }))} />
              </Field>
            </div>
            {lookupSuccess && (
              <div style={styles.lookupResult}>
                <span style={{ fontSize: 22 }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, color: "#15803d" }}>Mobilisation Confirmed</div>
                  <div style={{ fontSize: 13, color: "#166534" }}>
                    Your record has been found on the NYSC server. Proceed to biometric capture.
                  </div>
                </div>
              </div>
            )}
            <SubmitButton onClick={handleNext} loading={submitting} label="Submit & Verify Mobilisation" />
          </FormCard>
        )}

        {/* STEP 3: Biometrics Dashboard */}
        {currentStep === 3 && (
          <FormCard title="Biometric Capture Dashboard" subtitle="Step 4 of 4 — Capture your fingerprints and facial image to complete registration">
            <div style={styles.bioDashboard}>
              {/* Thumbprints */}
              <div style={styles.bioSection}>
                <div style={styles.bioSectionTitle}>
                  <span style={{ fontSize: 20 }}>🖐</span> Fingerprint Capture
                </div>
                <div style={styles.thumbGrid}>
                  {[["left","Left Thumb"],["right","Right Thumb"]].map(([hand, label]) => (
                    <div key={hand} style={{
                      ...styles.thumbCard,
                      border: `2px solid ${biometrics[`thumbprint${hand.charAt(0).toUpperCase()+hand.slice(1)}`] ? "#16a34a" : biometrics.scanningThumb === hand ? "#008751" : "#e5e7eb"}`
                    }}>
                      <div style={styles.thumbIcon}>
                        {biometrics[`thumbprint${hand.charAt(0).toUpperCase()+hand.slice(1)}`] ? (
                          <div style={styles.thumbSuccess}>✓</div>
                        ) : biometrics.scanningThumb === hand ? (
                          <div style={styles.thumbScanning}>
                            <ScanRings />
                          </div>
                        ) : (
                          <div style={styles.thumbPlaceholder}>
                            <svg width="48" height="60" viewBox="0 0 48 60" fill="none">
                              <ellipse cx="24" cy="12" rx="12" ry="12" fill="#d1d5db"/>
                              <rect x="12" y="22" width="24" height="38" rx="8" fill="#d1d5db"/>
                              <path d="M18 32 Q24 28 30 32" stroke="#9ca3af" strokeWidth="1.5" fill="none"/>
                              <path d="M16 38 Q24 33 32 38" stroke="#9ca3af" strokeWidth="1.5" fill="none"/>
                              <path d="M15 44 Q24 38 33 44" stroke="#9ca3af" strokeWidth="1.5" fill="none"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div style={styles.thumbLabel}>{label}</div>
                      {biometrics.scanningThumb === hand && (
                        <div style={styles.progressBar}>
                          <div style={{ ...styles.progressFill, width: `${thumbProgress[hand]}%` }} />
                        </div>
                      )}
                      {biometrics[`thumbprint${hand.charAt(0).toUpperCase()+hand.slice(1)}`] ? (
                        <div style={styles.capturedBadge}>Captured ✓</div>
                      ) : (
                        <button style={{
                          ...styles.scanBtn,
                          opacity: biometrics.scanningThumb ? 0.5 : 1,
                          cursor: biometrics.scanningThumb ? "not-allowed" : "pointer"
                        }}
                          disabled={!!biometrics.scanningThumb}
                          onClick={() => simulateThumb(hand)}>
                          {biometrics.scanningThumb === hand ? "Scanning..." : "Place Thumb & Scan"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Face Capture */}
              <div style={styles.bioSection}>
                <div style={styles.bioSectionTitle}>
                  <span style={{ fontSize: 20 }}>📷</span> Facial Capture
                </div>
                <div style={styles.faceCard}>
                  <div style={styles.faceViewport} ref={faceRef}>
                    {biometrics.faceCapture ? (
                      <div style={styles.faceCaptured}>
                        <div style={styles.faceSuccessCircle}>
                          <svg width="60" height="60" viewBox="0 0 60 60">
                            <circle cx="30" cy="22" r="12" fill="#4ade80"/>
                            <rect x="12" y="34" width="36" height="26" rx="10" fill="#4ade80"/>
                          </svg>
                        </div>
                        <div style={{ color: "#15803d", fontWeight: 700, fontSize: 15, marginTop: 8 }}>Face Captured ✓</div>
                      </div>
                    ) : biometrics.scanningFace ? (
                      <div style={styles.faceScanning}>
                        <FaceScanOverlay progress={faceProgress} />
                        <div style={styles.scanLine} />
                      </div>
                    ) : (
                      <div style={styles.facePlaceholder}>
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                          <circle cx="32" cy="24" r="14" fill="#d1d5db"/>
                          <rect x="10" y="38" width="44" height="30" rx="12" fill="#d1d5db"/>
                          <circle cx="26" cy="21" r="3" fill="#9ca3af"/>
                          <circle cx="38" cy="21" r="3" fill="#9ca3af"/>
                          <path d="M24 30 Q32 36 40 30" stroke="#9ca3af" strokeWidth="2" fill="none" strokeLinecap="round"/>
                        </svg>
                        <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>Position face in frame</div>
                      </div>
                    )}
                    {/* Corner brackets */}
                    {["tl","tr","bl","br"].map(c => <Corner key={c} pos={c} active={biometrics.scanningFace || biometrics.faceCapture} />)}
                  </div>
                  {biometrics.scanningFace && (
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${faceProgress}%` }} />
                    </div>
                  )}
                  {!biometrics.faceCapture && (
                    <button style={{
                      ...styles.scanBtn,
                      opacity: biometrics.scanningFace ? 0.5 : 1,
                      cursor: biometrics.scanningFace ? "not-allowed" : "pointer",
                      width: "100%", marginTop: 12
                    }}
                      disabled={biometrics.scanningFace}
                      onClick={simulateFace}>
                      {biometrics.scanningFace ? `Scanning... ${faceProgress}%` : "📷 Capture Face"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={styles.bioSummary}>
              <div style={bioStatus(biometrics.thumbprintLeft)}>Left Thumb {biometrics.thumbprintLeft ? "✓" : "Pending"}</div>
              <div style={bioStatus(biometrics.thumbprintRight)}>Right Thumb {biometrics.thumbprintRight ? "✓" : "Pending"}</div>
              <div style={bioStatus(biometrics.faceCapture)}>Facial Capture {biometrics.faceCapture ? "✓" : "Pending"}</div>
            </div>

            {!allBiometricsComplete && (
              <div style={styles.warningNote}>
                ⚠ Please complete all biometric captures before submitting.
              </div>
            )}
            <SubmitButton
              onClick={handleFinish}
              loading={submitting}
              disabled={!allBiometricsComplete}
              label={submitting ? "Finalising Registration..." : "Complete Registration"}
            />
          </FormCard>
        )}
      </div>
      <Footer />
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function Header() {
  return (
    <header style={styles.header}>
      <div style={styles.headerInner}>
        <div style={styles.logo}>
          <div style={styles.logoShield}>
            <span style={{ fontSize: 22 }}>🦅</span>
          </div>
          <div>
            <div style={styles.logoTitle}>NYSC</div>
            <div style={styles.logoSub}>National Youth Service Corps</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.headerBadge}>Online Registration Portal</div>
          <div style={styles.headerYear}>Batch 2025</div>
        </div>
      </div>
      <div style={styles.headerStripe} />
    </header>
  );
}

function Footer() {
  return (
    <footer style={styles.footer}>
      <div>© 2025 National Youth Service Corps. All Rights Reserved.</div>
      <div style={{ fontSize: 12, marginTop: 4, color: "#9ca3af" }}>
        For support, call: 0800-NYSC-HELP | Email: support@nysc.gov.ng
      </div>
    </footer>
  );
}

function FormCard({ title, subtitle, children }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>{title}</h2>
        <p style={styles.cardSubtitle}>{subtitle}</p>
      </div>
      <div style={styles.cardBody}>{children}</div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
      {error && <div style={styles.error}>⚠ {error}</div>}
    </div>
  );
}

function SubmitButton({ onClick, loading, disabled, label }) {
  return (
    <button style={{
      ...styles.submitBtn,
      opacity: loading || disabled ? 0.6 : 1,
      cursor: loading || disabled ? "not-allowed" : "pointer"
    }}
      onClick={onClick} disabled={loading || disabled}>
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={styles.spinner} />
          Processing...
        </span>
      ) : label}
    </button>
  );
}

function ScanRings() {
  return (
    <div style={{ position: "relative", width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%",
          border: "2px solid #008751",
          width: 20 + i * 16, height: 20 + i * 16,
          opacity: 0.6 - i * 0.15,
          animation: `pulse ${0.8 + i * 0.3}s ease-in-out infinite`
        }} />
      ))}
      <div style={{ fontSize: 22, zIndex: 1 }}>👆</div>
    </div>
  );
}

function FaceScanOverlay({ progress }) {
  return (
    <div style={{ position: "relative", width: 80, height: 80 }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="28" r="16" fill="rgba(0,135,81,0.15)" stroke="#008751" strokeWidth="2"/>
        <rect x="16" y="44" width="48" height="36" rx="14" fill="rgba(0,135,81,0.15)" stroke="#008751" strokeWidth="2"/>
        <circle cx="33" cy="25" r="3.5" fill="#008751"/>
        <circle cx="47" cy="25" r="3.5" fill="#008751"/>
        <path d="M30 35 Q40 42 50 35" stroke="#008751" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function Corner({ pos, active }) {
  const isTop = pos.startsWith("t");
  const isLeft = pos.endsWith("l");
  return (
    <div style={{
      position: "absolute",
      [isTop ? "top" : "bottom"]: 8,
      [isLeft ? "left" : "right"]: 8,
      width: 20, height: 20,
      borderTop: isTop ? `3px solid ${active ? "#008751" : "#9ca3af"}` : "none",
      borderBottom: !isTop ? `3px solid ${active ? "#008751" : "#9ca3af"}` : "none",
      borderLeft: isLeft ? `3px solid ${active ? "#008751" : "#9ca3af"}` : "none",
      borderRight: !isLeft ? `3px solid ${active ? "#008751" : "#9ca3af"}` : "none",
      borderRadius: isTop && isLeft ? "4px 0 0 0" : isTop && !isLeft ? "0 4px 0 0" : !isTop && isLeft ? "0 0 0 4px" : "0 0 4px 0"
    }} />
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

const inputStyle = (hasError) => ({
  width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14,
  border: `1.5px solid ${hasError ? "#ef4444" : "#d1d5db"}`,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  background: hasError ? "#fef2f2" : "#fff",
  transition: "border-color 0.2s"
});

const bioStatus = (done) => ({
  padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
  background: done ? "#f0fdf4" : "#f9fafb",
  color: done ? "#16a34a" : "#6b7280",
  border: `1.5px solid ${done ? "#86efac" : "#e5e7eb"}`
});

const styles = {
  page: { minHeight: "100vh", background: "#f3f4f6", fontFamily: "'Segoe UI', sans-serif", color: "#111827" },
  header: { background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 100 },
  headerInner: { maxWidth: 860, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerStripe: { height: 4, background: "linear-gradient(90deg, #008751 0%, #008751 33%, #fff 33%, #fff 66%, #00c47a 66%)" },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoShield: { width: 48, height: 48, background: "linear-gradient(135deg, #008751, #005c36)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,135,81,0.3)" },
  logoTitle: { fontWeight: 900, fontSize: 22, color: "#008751", letterSpacing: 2 },
  logoSub: { fontSize: 11, color: "#6b7280", fontWeight: 500, letterSpacing: 0.5 },
  headerRight: { textAlign: "right" },
  headerBadge: { background: "#008751", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: 0.5 },
  headerYear: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  container: { maxWidth: 760, margin: "0 auto", padding: "32px 16px" },
  stepper: { display: "flex", alignItems: "center", marginBottom: 28, background: "#fff", borderRadius: 12, padding: "16px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  stepItem: { display: "flex", alignItems: "center", flex: 1, position: "relative" },
  stepCircle: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0, transition: "all 0.3s" },
  stepLabel: { fontSize: 12, marginLeft: 8, whiteSpace: "nowrap", transition: "color 0.3s" },
  stepLine: { flex: 1, height: 2, marginLeft: 8, transition: "background 0.3s" },
  card: { background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "hidden" },
  cardHeader: { background: "linear-gradient(135deg, #005c36 0%, #008751 100%)", padding: "24px 32px" },
  cardTitle: { margin: 0, color: "#fff", fontSize: 22, fontWeight: 800 },
  cardSubtitle: { margin: "6px 0 0", color: "rgba(255,255,255,0.8)", fontSize: 14 },
  cardBody: { padding: "28px 32px" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  field: { marginBottom: 18 },
  label: { display: "block", fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 },
  error: { color: "#ef4444", fontSize: 12, marginTop: 4 },
  fieldNote: { color: "#6b7280", fontSize: 12, marginTop: 5, paddingLeft: 2 },
  radioGroup: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 },
  radioLabel: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s" },
  submitBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #008751, #005c36)", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.2s" },
  spinner: { width: 18, height: 18, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" },
  alertBanner: { background: "#fffbeb", border: "1.5px solid #fbbf24", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20 },
  credentialBox: { background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "16px", marginBottom: 20 },
  credentialTitle: { fontWeight: 700, fontSize: 13, color: "#15803d", marginBottom: 10 },
  credRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 14 },
  captchaRow: { display: "flex", gap: 12, alignItems: "stretch" },
  captchaBox: { display: "flex", alignItems: "center", gap: 4, background: "#f3f4f6", border: "1.5px solid #d1d5db", borderRadius: 8, padding: "10px 16px", userSelect: "none", letterSpacing: 2 },
  captchaChar: { fontSize: 20, fontWeight: 900, fontFamily: "monospace", display: "inline-block" },
  lookupInfo: { background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20 },
  lookupResult: { background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", marginBottom: 20 },
  bioDashboard: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  bioSection: { display: "flex", flexDirection: "column", gap: 12 },
  bioSectionTitle: { fontWeight: 700, fontSize: 15, color: "#374151", display: "flex", alignItems: "center", gap: 6, paddingBottom: 8, borderBottom: "2px solid #f3f4f6" },
  thumbGrid: { display: "flex", flexDirection: "column", gap: 12 },
  thumbCard: { background: "#fafafa", borderRadius: 12, padding: 16, textAlign: "center", transition: "border-color 0.3s" },
  thumbIcon: { display: "flex", justifyContent: "center", alignItems: "center", height: 80 },
  thumbPlaceholder: { opacity: 0.5 },
  thumbScanning: { display: "flex", justifyContent: "center", alignItems: "center" },
  thumbSuccess: { width: 60, height: 60, background: "#16a34a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28, fontWeight: 700 },
  thumbLabel: { fontWeight: 600, fontSize: 13, color: "#374151", marginTop: 8, marginBottom: 8 },
  scanBtn: { background: "#008751", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" },
  capturedBadge: { background: "#f0fdf4", color: "#16a34a", fontWeight: 700, fontSize: 13, padding: "6px 0", borderRadius: 8 },
  progressBar: { height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden", marginTop: 8 },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #008751, #00c47a)", borderRadius: 3, transition: "width 0.1s" },
  faceCard: { background: "#fafafa", borderRadius: 12, padding: 16 },
  faceViewport: { position: "relative", background: "#111", borderRadius: 10, height: 160, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  facePlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", opacity: 0.6 },
  faceScanning: { display: "flex", alignItems: "center", justifyContent: "center" },
  scanLine: { position: "absolute", left: 0, right: 0, height: 2, background: "rgba(0,135,81,0.8)", top: "50%", animation: "scanline 1.5s ease-in-out infinite alternate" },
  faceCaptured: { display: "flex", flexDirection: "column", alignItems: "center" },
  faceSuccessCircle: {},
  bioSummary: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20, marginBottom: 12 },
  warningNote: { background: "#fffbeb", border: "1.5px solid #fbbf24", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 12 },
  footer: { background: "#1f2937", color: "#d1d5db", textAlign: "center", padding: "20px 16px", marginTop: 40, fontSize: 13 },
  successContainer: { maxWidth: 560, margin: "60px auto", background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" },
  successIcon: { width: 80, height: 80, background: "linear-gradient(135deg, #16a34a, #008751)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#fff", margin: "0 auto 20px", fontWeight: 700 },
  successTitle: { fontSize: 26, fontWeight: 800, color: "#111827", margin: "0 0 12px" },
  successText: { color: "#4b5563", fontSize: 15, lineHeight: 1.6 },
  successCard: { background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", marginTop: 20, textAlign: "left" },
  successRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: 14 }
};

// Inject keyframes safely inside React
function useGlobalStyles() {
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.textContent = `
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.1); opacity: 1; } }
      @keyframes scanline { 0% { top: 20%; } 100% { top: 80%; } }
    `;
    document.head.appendChild(styleTag);
    return () => { document.head.removeChild(styleTag); };
  }, []);
}
