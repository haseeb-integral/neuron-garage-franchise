/** E-sign consent notice — approved by Sam Reed on Oct 26, 2026. Change the version if the words change. */
export const ESIGN_CONSENT_VERSION = "1";
export const ESIGN_CONSENT_TITLE = "Electronic Records and Signatures";
export const ESIGN_CONSENT_INTRO =
  "Neuron Garage Franchise Support, LLC would like to give you forms, notices, and records about your franchise application electronically, and let you sign them electronically.";
export const ESIGN_CONSENT_POINTS: { label: string; text: string }[] = [
  { label: "Paper copies", text: "You may ask for a free paper copy of any record by emailing Franchise@NeuronGarage.com or calling Skyler Bossen at 512-593-2750." },
  { label: "Changing your mind", text: "You may take back this consent at any time, the same way. This does not affect anything you have already signed. After that, we will send you forms on paper." },
  { label: "What this covers", text: "the forms in your Neuron Garage owner portal." },
  { label: "What you need", text: "a device with an up-to-date web browser, internet access, an email address, and a way to open and save PDF files." },
  { label: "New email address?", text: "Tell us at Franchise@NeuronGarage.com." },
];
export const ESIGN_CONSENT_AGREE =
  "I have read this notice, I can open and save PDF files, and I agree to use electronic records and signatures.";

/** The full notice as one block of text, saved with each signature. */
export const ESIGN_CONSENT_FULL_TEXT = [
  ESIGN_CONSENT_TITLE,
  ESIGN_CONSENT_INTRO,
  ...ESIGN_CONSENT_POINTS.map((p) => `${p.label}${p.label.endsWith("?") ? "" : ":"} ${p.text}`),
  `[x] ${ESIGN_CONSENT_AGREE}`,
].join("\n");
