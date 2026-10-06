import { POTETO_COUNT } from "@/lib/racers";

const SHAPES = { wide: 100, narrow: 50 } as const;
const PITCH = 10;
const CELL = 8;

function Grid({ kind, count }: { kind: keyof typeof SHAPES; count: number }) {
  const cols = SHAPES[kind];
  const rows = POTETO_COUNT / cols;
  const extra = Math.max(0, count - POTETO_COUNT);
  const extraRows = Math.ceil(extra / cols);
  const height = (rows + (extraRows ? extraRows + 1 : 0)) * PITCH - (PITCH - CELL);
  const rects = [];
  for (let i = 0; i < POTETO_COUNT; i++) {
    rects.push(<rect key={i} x={(i % cols) * PITCH} y={Math.floor(i / cols) * PITCH} width={CELL} height={CELL} className={i < count ? "cell-you" : "cell-empty"} />);
  }
  for (let i = 0; i < extra; i++) {
    rects.push(<rect key={`x${i}`} x={(i % cols) * PITCH} y={(rows + 1 + Math.floor(i / cols)) * PITCH} width={CELL} height={CELL} className="cell-you" />);
  }
  return (
    <svg className={kind} viewBox={`0 0 ${cols * PITCH - (PITCH - CELL)} ${height}`} aria-hidden="true">
      {rects}
    </svg>
  );
}

export function PotetoGrid({ count }: { count: number }) {
  return (
    <div className="grid">
      <Grid kind="wide" count={count} />
      <Grid kind="narrow" count={count} />
    </div>
  );
}
