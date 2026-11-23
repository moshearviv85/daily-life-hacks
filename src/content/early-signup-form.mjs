/**
 * Compact early signup, as a hast tree, so the article body can include it
 * at build time. Same fields and data attributes as Newsletter.astro.
 */
import {
  EARLY_BUTTON_STYLE,
  EARLY_HEADING_STYLE,
  EARLY_INPUT_STYLE,
  EARLY_PITCH_STYLE,
  EARLY_SECTION_STYLE,
  SIGNUP_OFFERS,
  SR_ONLY_STYLE,
} from "./signup-offers.mjs";

function text(value) {
  return { type: "text", value };
}

function el(tagName, properties, children = []) {
  return { type: "element", tagName, properties, children };
}

export function earlySignupNode({ variant, category = "", baseSlug = "" }) {
  const offer = SIGNUP_OFFERS[variant];
  if (!offer || variant === "generic") return null;
  const pitch = offer.earlyPitch || offer.pitch;

  return el(
    "section",
    {
      id: "early-newsletter",
      dataSignupForm: "true",
      dataSignupOffer: variant,
      dataSignupPlacement: "early",
      dataSignupCategory: category,
      dataSignupBaseSlug: baseSlug,
      style: EARLY_SECTION_STYLE,
    },
    [
      el("h2", { style: EARLY_HEADING_STYLE }, [text(offer.heading)]),
      el("p", { style: EARLY_PITCH_STYLE }, [text(pitch)]),
      el("form", { id: "early-newsletter-form", style: "margin:0;" }, [
        el("label", { htmlFor: "early-email", style: SR_ONLY_STYLE }, [text("Email address")]),
        el("input", {
          id: "early-email",
          name: "email",
          type: "email",
          autocomplete: "email",
          inputMode: "email",
          placeholder: "Enter your email",
          required: true,
          style: EARLY_INPUT_STYLE,
        }),
        el(
          "label",
          {
            htmlFor: "early-consent",
            style: "display:flex;gap:0.5rem;align-items:flex-start;margin:0.65rem 0;font-size:0.75rem;line-height:1.35;color:var(--muted-color);",
          },
          [
            el("input", {
              id: "early-consent",
              name: "consent",
              type: "checkbox",
              required: true,
              style: "margin-top:0.15rem;accent-color:#F29B30;",
            }),
            el("span", {}, [
              text("I agree to receive email newsletters and accept the "),
              el("a", { href: "/privacy/", style: "color:inherit;" }, [text("Privacy Policy")]),
              text(". You can unsubscribe at any time."),
            ]),
          ],
        ),
        el(
          "button",
          { id: "early-submit-btn", type: "submit", style: EARLY_BUTTON_STYLE },
          [text(offer.buttonLabel)],
        ),
      ]),
      el(
        "div",
        {
          id: "early-success",
          dataSignupSuccess: "true",
          hidden: true,
          role: "status",
        },
        [el("p", { style: EARLY_PITCH_STYLE }, [text(offer.successText)])],
      ),
    ],
  );
}
