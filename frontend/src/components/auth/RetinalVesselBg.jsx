import { Box } from '@mui/material';

/**
 * Renders a subtle retinal vessel / fundus-inspired SVG pattern
 * as a background watermark for the login page.
 */
/**
 * RetinalVesselBg renders a stylized SVG watermark inspired by fundus photography.
 * Used to provide a subtle medical-grade aesthetic to the login portal.
 */
export default function RetinalVesselBg() {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox="0 0 800 800"
        width="900"
        height="900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* ── Optic Disc (Central Anchor) ── */}
        <circle cx="400" cy="400" r="60" stroke="#0057c0" strokeWidth="1.5" opacity="0.6" />
        <circle cx="400" cy="400" r="45" stroke="#00685f" strokeWidth="1" opacity="0.4" />
        <circle cx="400" cy="400" r="28" fill="#0057c0" opacity="0.08" />

        {/* ── Primary Vascular Arcades ── */}
        <path d="M400 340 Q380 280 340 200 Q320 160 280 100" stroke="#0057c0" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        <path d="M400 340 Q430 270 480 190 Q510 140 540 80" stroke="#0057c0" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

        {/* Major vessel branches — inferior */}
        <path d="M400 460 Q380 520 340 600 Q310 660 270 720" stroke="#0057c0" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        <path d="M400 460 Q430 530 480 610 Q520 670 560 730" stroke="#0057c0" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

        {/* Secondary branches — superior-temporal */}
        <path d="M340 200 Q300 180 250 170" stroke="#0057c0" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
        <path d="M340 200 Q320 220 290 250" stroke="#00685f" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
        <path d="M480 190 Q520 175 570 165" stroke="#0057c0" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
        <path d="M480 190 Q500 215 530 250" stroke="#00685f" strokeWidth="1" strokeLinecap="round" opacity="0.3" />

        {/* Secondary branches — inferior-temporal */}
        <path d="M340 600 Q300 620 250 635" stroke="#0057c0" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
        <path d="M340 600 Q315 575 285 545" stroke="#00685f" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
        <path d="M480 610 Q520 630 570 640" stroke="#0057c0" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
        <path d="M480 610 Q505 585 535 555" stroke="#00685f" strokeWidth="1" strokeLinecap="round" opacity="0.3" />

        {/* Tertiary micro-vessels */}
        <path d="M250 170 Q220 155 180 150" stroke="#0057c0" strokeWidth="0.8" strokeLinecap="round" opacity="0.25" />
        <path d="M250 170 Q240 195 225 230" stroke="#00685f" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />
        <path d="M570 165 Q600 155 640 155" stroke="#0057c0" strokeWidth="0.8" strokeLinecap="round" opacity="0.25" />
        <path d="M570 165 Q580 190 595 225" stroke="#00685f" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />
        <path d="M250 635 Q220 650 180 660" stroke="#0057c0" strokeWidth="0.8" strokeLinecap="round" opacity="0.25" />
        <path d="M570 640 Q600 650 640 655" stroke="#0057c0" strokeWidth="0.8" strokeLinecap="round" opacity="0.25" />

        {/* Nasal vessels */}
        <path d="M340 400 Q280 390 200 395" stroke="#0057c0" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        <path d="M460 400 Q520 410 600 405" stroke="#0057c0" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        <path d="M200 395 Q160 385 120 390" stroke="#00685f" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />
        <path d="M600 405 Q640 415 680 410" stroke="#00685f" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />

        {/* Macula region — fovea */}
        <circle cx="500" cy="400" r="35" stroke="#00685f" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.25" />
        <circle cx="500" cy="400" r="12" fill="#00685f" opacity="0.06" />
      </svg>
    </Box>
  );
}
