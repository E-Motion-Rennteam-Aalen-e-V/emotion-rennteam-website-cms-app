export default function HumanCreatedBadge({ className = "h-28 w-28" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      stroke="currentColor"
      role="img"
      aria-label="100% menschlich erstellter Inhalt"
    >
      <circle cx="100" cy="100" r="94" strokeWidth="3" />
      <circle cx="100" cy="100" r="76" strokeWidth="1.5" opacity="0.6" />

      <path id="badgeTopArc" d="M 26 100 A 74 74 0 0 1 174 100" fill="none" />
      <path id="badgeBottomArc" d="M 174 100 A 74 74 0 0 1 26 100" fill="none" />

      <text
        fontSize="17"
        fontWeight="700"
        letterSpacing="2"
        fill="currentColor"
        stroke="none"
      >
        <textPath href="#badgeTopArc" startOffset="50%" textAnchor="middle">
          100% HUMAN
        </textPath>
      </text>
      <text
        fontSize="17"
        fontWeight="700"
        letterSpacing="1.5"
        fill="currentColor"
        stroke="none"
      >
        <textPath href="#badgeBottomArc" startOffset="50%" textAnchor="middle">
          CREATED CONTENT
        </textPath>
      </text>

      {[
        [26, 100],
        [174, 100],
      ].map(([cx, cy], i) => (
        <path
          key={i}
          d="M0,-8 L2.2,-2.5 8,-2.5 3.2,1 5,7.5 0,4 -5,7.5 -3.2,1 -8,-2.5 -2.2,-2.5 Z"
          transform={`translate(${cx} ${cy}) scale(0.75)`}
          fill="currentColor"
          stroke="none"
        />
      ))}

      <g transform="translate(100 100)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-14,-30 C-26,-26 -32,-14 -30,-2 C-29,6 -24,10 -22,16 L-22,30 L-6,30 L-6,20 L4,20 C14,20 22,12 22,2 C22,-4 19,-8 19,-13 C19,-24 10,-32 -2,-33 C-7,-33.5 -10.5,-32 -14,-30 Z" />
        <path d="M-16,-16 C-13,-20 -8,-20 -6,-16 C-3,-21 3,-20 4,-15 C9,-16 12,-11 9,-7 C13,-5 11,1 6,0 C7,5 1,8 -3,5 C-5,9 -11,7 -11,2 C-16,3 -19,-2 -15,-6 C-19,-9 -18,-14 -16,-16 Z" />
      </g>
    </svg>
  );
}
