import React, { useId, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ReferenceDot, ReferenceLine, XAxis, YAxis,
} from 'recharts';
import katex from 'katex';
import './concept-figure.css';

const ACCENT = '#E94C35';
const MINT = '#D8E8DF';
const INK = '#505A53';
const AXIS = { fill: INK, fontSize: 11, fontFamily: 'inherit' };
const format = value => Number(value.toFixed(3)).toString();

function Formula({ value }) {
  return <span className="cf-formula" dangerouslySetInnerHTML={{ __html: katex.renderToString(value || '', { throwOnError: false, strict: 'ignore' }) }} />;
}

function Slider({ label, value, min = 0, max, onChange, valueText }) {
  const id = useId();
  return <div className="cf-slider-control">
    <div className="cf-control-label"><label htmlFor={id}>{label}</label><span>{valueText || value}</span></div>
    <input id={id} type="range" min={min} max={max} step="1" value={value} onChange={event => onChange(Number(event.target.value))} aria-valuetext={valueText || String(value)} />
  </div>;
}

function Shell({ title, children, compact, className = '' }) {
  return <figure className={`cf-figure ${compact ? 'cf-compact' : ''} ${className}`}>
    <figcaption className="cf-caption">{title}</figcaption>
    {children}
  </figure>;
}

function ChartFrame({ label, children, square = false }) {
  return <div className={`cf-chart ${square ? 'cf-chart-square' : ''}`} role="img" aria-label={label}>{children}</div>;
}

function PartsOfWhole({ id, compact, interactive }) {
  const [parts, setParts] = useState(1);
  const value = parts / 4;
  const labels = { fractions: 'Equal parts. One whole.', decimals: 'A decimal you can see.', percentages: 'A share of the whole.' };
  return <Shell title={labels[id]} compact={compact} className="cf-parts">
    <div className="cf-parts-layout">
      <div className="cf-wheel">
        <ChartFrame square label={`${parts} of 4 equal parts selected: ${value} or ${value * 100} percent.`}>
          <PieChart width={300} height={260} accessibilityLayer={false}>
            <Pie data={[0, 1, 2, 3].map(index => ({ value: 1, index }))} dataKey="value" cx={150} cy={130} innerRadius={73} outerRadius={112} paddingAngle={4} cornerRadius={2} startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
              {[0, 1, 2, 3].map(index => <Cell key={index} fill={index < parts ? ACCENT : '#DEE3DF'} />)}
            </Pie>
          </PieChart>
        </ChartFrame>
        <div className="cf-wheel-center" aria-hidden="true"><span>{parts}</span><i /><span>4</span></div>
      </div>
      {compact ? <div className="cf-equivalence-strip">
        <strong>{parts}/4 <span>=</span> {format(value)} <span>=</span> {format(value * 100)}%</strong>
        <span>{id === 'percentages' ? `${format(value * 100)}% of 80 = ${format(value * 80)}` : 'One amount, three ways to write it.'}</span>
      </div> : <div className="cf-equivalents" aria-live="polite" aria-atomic="true">
        <span className="cf-quantity-label">Same amount</span>
        <div className="cf-equivalent"><strong>{format(value)}</strong><span>as a decimal</span></div>
        <div className="cf-equivalent"><strong>{format(value * 100)}<small>%</small></strong><span>as a percentage</span></div>
      </div>}
    </div>
    {interactive && !compact && <div className="cf-part-controls">
      <span className="cf-control-hint">Try a different share</span>
      <div className="cf-segments" role="group" aria-label="Select a fraction of the whole">
        {[1, 2, 3, 4].map(n => <button type="button" key={n} aria-label={`${n} of 4 equal parts`} aria-pressed={parts === n} onClick={() => setParts(n)}><span>{n}/4</span></button>)}
      </div>
    </div>}
    {!compact && <p className="cf-explanation">{id === 'percentages' ? `${format(value * 100)}% of 80 = ${format(value * 80)}` : `${parts}/4 = ${format(value)} = ${format(value * 100)}%`}</p>}
  </Shell>;
}

function Probability({ compact, interactive }) {
  const [red, setRed] = useState(3);
  const counters = Array.from({ length: 8 }, (_, i) => ({ value: 1, red: i < red }));
  return <Shell title="Every counter has the same chance." compact={compact} className="cf-probability">
    <ChartFrame label={`A bag contains ${red} red counters and ${8 - red} blue counters. Probability of drawing red is ${red}/8.`}>
      <BarChart width={340} height={172} data={[{ name: 'Counters', ...Object.fromEntries(counters.map((_, i) => [`counter${i}`, 1])) }]} layout="vertical" margin={{ top: 25, right: 12, left: 12, bottom: 25 }} accessibilityLayer={false} barSize={56}>
        <XAxis type="number" domain={[0, 8]} hide /><YAxis dataKey="name" type="category" hide />
        {counters.map((counter, i) => <Bar key={i} dataKey={`counter${i}`} stackId="counters" fill={counter.red ? ACCENT : '#7A8E9A'} stroke="#F7F8F6" strokeWidth={4} isAnimationActive={false} />)}
      </BarChart>
    </ChartFrame>
    <div className="cf-answer" aria-live="polite">P(red) = <strong>{red}/8</strong><span>{format(red / 8 * 100)}%</span></div>
    {interactive && !compact && <Slider label="Red counters" value={red} max={8} onChange={setRed} valueText={`${red} red · ${8 - red} blue`} />}
    <p className="cf-explanation">Red counters ÷ all counters</p>
  </Shell>;
}

function Ratios({ compact, interactive }) {
  const [scale, setScale] = useState(1);
  return <Shell title="Scale both quantities together." compact={compact}>
    <ChartFrame label={`${2 * scale} cups of flour make ${3 * scale} servings. The flour-to-servings ratio is always 2 to 3.`}>
      <BarChart width={340} height={195} data={[{ name: 'Flour · cups', amount: 2 * scale }, { name: 'Servings', amount: 3 * scale }]} margin={{ left: 0, right: 12, top: 20, bottom: 5 }} accessibilityLayer={false} barSize={64}>
        <CartesianGrid vertical={false} stroke="#E1E5E1" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS} /><YAxis domain={[0, 9]} ticks={[0, 3, 6, 9]} width={28} tick={AXIS} axisLine={false} tickLine={false} />
        <Bar dataKey="amount" radius={[3, 3, 0, 0]} isAnimationActive={false} label={{ position: 'top', fill: INK, fontSize: 12 }}>{[ACCENT, MINT].map(color => <Cell key={color} fill={color} />)}</Bar>
      </BarChart>
    </ChartFrame>
    <div className="cf-answer" aria-live="polite"><strong>{2 * scale} : {3 * scale}</strong><span>same ratio as 2 : 3</span></div>
    {interactive && !compact && <Slider label="Recipe size" min={1} max={3} value={scale} valueText={`${scale}× the recipe`} onChange={setScale} />}
  </Shell>;
}

function IntegerArithmetic({ compact, interactive }) {
  const [jump, setJump] = useState(8);
  const result = -3 + jump;
  return <Shell title="Move right to add." compact={compact}>
    <ChartFrame label={`Start at negative 3. Add ${jump} to arrive at ${result}.`}>
      <LineChart width={340} height={180} data={[{ x: -3, y: 0 }, { x: result, y: 0 }]} margin={{ left: 18, right: 18, top: 30, bottom: 20 }} accessibilityLayer={false}>
        <XAxis dataKey="x" type="number" domain={[-4, 8]} ticks={[-4, -2, 0, 2, 4, 6, 8]} tick={AXIS} tickLine={false} axisLine={{ stroke: '#BDC5BE' }} /><YAxis domain={[-1, 1]} hide />
        <ReferenceLine y={0} stroke="#D5DCD6" />
        <Line dataKey="y" stroke={ACCENT} strokeWidth={7} isAnimationActive={false} dot={false} />
        <ReferenceDot x={-3} y={0} r={6} fill="#839087" stroke="#fff" strokeWidth={2} label={{ position: 'top', value: '−3', fill: INK }} />
        <ReferenceDot x={result} y={0} r={8} fill={ACCENT} stroke="#fff" strokeWidth={3} label={{ position: 'top', value: format(result), fill: ACCENT }} />
      </LineChart>
    </ChartFrame>
    <div className="cf-answer" aria-live="polite">−3 + {jump} = <strong>{result}</strong></div>
    {interactive && !compact && <Slider label="Amount to add" value={jump} max={10} onChange={setJump} valueText={`Add ${jump}`} />}
  </Shell>;
}

function FunctionPlot({ id, compact, interactive }) {
  const [x, setX] = useState(4);
  const linear = id === 'linear_equations';
  const quadratic = id === 'quadratic_equations';
  const polynomial = id === 'polynomials';
  const min = linear ? 0 : quadratic ? 0 : -4;
  const max = linear ? 6 : quadratic ? 5 : 3;
  const fn = value => linear ? 2 * value + 3 : quadratic ? value * value - 5 * value + 6 : polynomial ? (value + 2) * (value + 3) : 5 * value + 6;
  const data = Array.from({ length: 81 }, (_, index) => { const value = min + (max - min) * index / 80; return { x: value, y: fn(value) }; });
  const titles = { linear_equations: 'Find where both sides agree.', quadratic_equations: 'The roots meet the x-axis.', polynomials: 'Two factors. One curve.', algebraic_simplification: 'Two expressions. The same line.' };
  const equation = linear ? 'y = 2x + 3' : quadratic ? 'y = x² − 5x + 6' : polynomial ? 'y = (x + 2)(x + 3)' : 'y = 3(x + 2) + 2x = 5x + 6';
  return <Shell title={titles[id]} compact={compact}>
    <ChartFrame label={linear ? `The line y = 2x + 3 meets y = 11 at x = 4. The selected x value is ${x}.` : quadratic ? 'The curve y = x squared minus 5x plus 6 crosses the x-axis at 2 and 3.' : polynomial ? 'The curve y = (x + 2)(x + 3) crosses the x-axis at negative 3 and negative 2.' : 'Both expressions 3(x + 2) + 2x and 5x + 6 give the same line.'}>
      <LineChart width={340} height={214} data={data} margin={{ left: 0, right: 19, top: 18, bottom: 8 }} accessibilityLayer={false}>
        <CartesianGrid stroke="#E1E5E1" strokeDasharray="3 5" />
        <XAxis dataKey="x" type="number" domain={[min, max]} tick={AXIS} tickLine={false} axisLine={false} ticks={linear ? [0, 2, 4, 6] : quadratic ? [0, 1, 2, 3, 4, 5] : [-4, -2, 0, 2]} />
        <YAxis width={34} tick={AXIS} tickLine={false} axisLine={false} domain={linear ? [0, 16] : undefined} />
        <ReferenceLine y={0} stroke="#AEBAB1" />
        {!linear && <ReferenceLine x={0} stroke="#AEBAB1" />}
        <Line dataKey="y" type="linear" stroke={ACCENT} strokeWidth={3.5} dot={false} isAnimationActive={false} />
        {linear && <ReferenceLine y={11} stroke="#82A491" strokeWidth={2} strokeDasharray="5 5" label={{ position: 'insideTopRight', value: 'y = 11', fill: '#3E6753', fontSize: 11 }} />}
        {linear && <ReferenceDot x={x} y={fn(x)} r={6} fill={ACCENT} stroke="#fff" strokeWidth={3} />}
        {(quadratic || polynomial) && (quadratic ? [2, 3] : [-3, -2]).map(root => <ReferenceDot key={root} x={root} y={0} r={5} fill="#3E6753" stroke="#fff" strokeWidth={2} />)}
      </LineChart>
    </ChartFrame>
    <p className="cf-plot-equation">{equation}</p>
    {linear && <div className="cf-answer cf-answer-small" aria-live="polite">2 × {x} + 3 = <strong>{fn(x)}</strong><span>{x === 4 ? 'Both sides equal 11' : `${fn(x)} ≠ 11`}</span></div>}
    {linear && interactive && !compact && <Slider label="Value of x" value={x} max={6} onChange={setX} valueText={`x = ${x}`} />}
    {quadratic && <p className="cf-explanation">At x = 2 and x = 3, y = 0.</p>}
    {polynomial && <p className="cf-explanation">(x + 2)(x + 3) = x² + 5x + 6</p>}
  </Shell>;
}

function Exponents({ compact, interactive }) {
  const [power, setPower] = useState(5);
  const data = Array.from({ length: 6 }, (_, exponent) => ({ exponent, value: 2 ** exponent }));
  return <Shell title="One more factor. Twice the amount." compact={compact}>
    <ChartFrame label="The powers of two from exponent 0 through 5 have values 1, 2, 4, 8, 16, and 32.">
      <BarChart width={340} height={200} data={data} margin={{ top: 17, left: 0, right: 12, bottom: 7 }} accessibilityLayer={false}>
        <CartesianGrid vertical={false} stroke="#E1E5E1" /><XAxis dataKey="exponent" tickFormatter={value => `2${['⁰', '¹', '²', '³', '⁴', '⁵'][value]}`} tick={AXIS} tickLine={false} axisLine={false} /><YAxis width={29} ticks={[0, 8, 16, 24, 32]} domain={[0, 36]} tick={AXIS} tickLine={false} axisLine={false} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false} label={{ position: 'top', fill: INK, fontSize: 11 }}>{data.map(d => <Cell key={d.exponent} fill={d.exponent === power ? ACCENT : '#DEE3DF'} />)}</Bar>
      </BarChart>
    </ChartFrame>
    <div className="cf-answer" aria-live="polite">2<sup>{power}</sup> = <strong>{2 ** power}</strong></div>
    {interactive && !compact && <Slider label="Exponent" value={power} max={5} onChange={setPower} />}
  </Shell>;
}

function Geometry({ id, compact, interactive }) {
  const area = id === 'geometry_area';
  const [height, setHeight] = useState(area ? 3 : 2);
  return <Shell title={area ? 'Half of a rectangle.' : 'Build volume, one layer at a time.'} compact={compact}>
    {area ? <ChartFrame label={`A right triangle with base 8 centimeters and perpendicular height ${height} centimeters. Area is ${4 * height} square centimeters.`}>
      <AreaChart width={340} height={206} data={[{ x: 0, y: 0 }, { x: 8, y: height }]} margin={{ left: 0, right: 20, top: 18, bottom: 10 }} accessibilityLayer={false}>
        <CartesianGrid stroke="#E1E5E1" /><XAxis dataKey="x" type="number" domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} tick={AXIS} tickLine={false} axisLine={false} /><YAxis width={25} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={AXIS} tickLine={false} axisLine={false} />
        <ReferenceLine y={height} stroke="#AEBAB1" strokeDasharray="4 4" /><ReferenceLine x={8} stroke="#AEBAB1" strokeDasharray="4 4" />
        <Area dataKey="y" type="linear" stroke={ACCENT} strokeWidth={2.5} fill={ACCENT} fillOpacity={.18} isAnimationActive={false} />
      </AreaChart>
    </ChartFrame> : <ChartFrame label={`A rectangular prism with a 4 by 3 centimeter base and ${height} layers each 1 centimeter high. The volume is ${12 * height} cubic centimeters.`}>
      <BarChart width={340} height={210} data={[{ name: '4 × 3 cm base', ...Object.fromEntries(Array.from({ length: height }, (_, i) => [`layer${i}`, 12])) }]} margin={{ top: 15, right: 25, left: 5, bottom: 5 }} accessibilityLayer={false} barSize={150}>
        <CartesianGrid vertical={false} stroke="#E1E5E1" /><XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} /><YAxis width={32} domain={[0, 60]} ticks={[0, 12, 24, 36, 48, 60]} tick={AXIS} tickLine={false} axisLine={false} />
        {Array.from({ length: height }, (_, i) => <Bar key={i} dataKey={`layer${i}`} stackId="volume" fill={i === height - 1 ? ACCENT : '#CFD8D1'} stroke="#F7F8F6" strokeWidth={2} isAnimationActive={false} />)}
      </BarChart>
    </ChartFrame>}
    <div className="cf-answer" aria-live="polite">{area ? `½ × 8 × ${height}` : `4 × 3 × ${height}`} = <strong>{area ? 4 * height : 12 * height}<small> cm<sup>{area ? 2 : 3}</sup></small></strong></div>
    {interactive && !compact && <Slider label={area ? 'Triangle height' : 'Prism height'} min={1} max={5} value={height} valueText={`${height} cm`} onChange={setHeight} />}
    <p className="cf-explanation">{area ? 'Axes measured in centimeters.' : 'Each layer adds 12 cm³. Vertical scale: volume in cm³.'}</p>
  </Shell>;
}

function DataInterpretation({ compact, interactive }) {
  const [votes, setVotes] = useState(12);
  return <Shell title="Read the part against the total." compact={compact}>
    <ChartFrame label={`A survey has 20 votes. Option A received ${votes} and option B received ${20 - votes}. Option A received ${votes * 5} percent of all votes.`}>
      <BarChart width={340} height={190} data={[{ name: 'Option A', votes }, { name: 'Option B', votes: 20 - votes }]} margin={{ top: 20, right: 15, left: 0, bottom: 8 }} accessibilityLayer={false} barSize={75}>
        <CartesianGrid vertical={false} stroke="#E1E5E1" /><XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} /><YAxis width={28} domain={[0, 20]} ticks={[0, 5, 10, 15, 20]} tick={AXIS} tickLine={false} axisLine={false} />
        <Bar dataKey="votes" radius={[3, 3, 0, 0]} isAnimationActive={false} label={{ position: 'top', fill: INK, fontSize: 12 }}>{[ACCENT, MINT].map(color => <Cell key={color} fill={color} />)}</Bar>
      </BarChart>
    </ChartFrame>
    <div className="cf-answer" aria-live="polite">{votes} of 20 votes = <strong>{votes * 5}%</strong></div>
    {interactive && !compact && <Slider label="Votes for option A" value={votes} max={20} onChange={setVotes} />}
    <p className="cf-explanation">Illustrative survey · 20 total votes</p>
  </Shell>;
}

function FigureForConcept({ concept, compact, interactive }) {
  const id = typeof concept === 'string' ? concept : concept?.id;
  const props = { id, compact, interactive };
  if (['fractions', 'decimals', 'percentages'].includes(id)) return <PartsOfWhole {...props} />;
  if (id === 'probability_basics') return <Probability {...props} />;
  if (id === 'ratios_proportions') return <Ratios {...props} />;
  if (id === 'integer_arithmetic') return <IntegerArithmetic {...props} />;
  if (['linear_equations', 'algebraic_simplification', 'polynomials', 'quadratic_equations'].includes(id)) return <FunctionPlot {...props} />;
  if (id === 'exponents') return <Exponents {...props} />;
  if (['geometry_area', 'geometry_volume'].includes(id)) return <Geometry {...props} />;
  if (id === 'data_interpretation') return <DataInterpretation {...props} />;
  return <Shell title={concept?.label || 'A worked example'} compact={compact}><Formula value={concept?.example_latex || 'a+b=b+a'} /></Shell>;
}

export default function ConceptFigure({ concept, compact = false, interactive = true }) {
  const id = typeof concept === 'string' ? concept : concept?.id;
  // A new concept starts at its authored example, rather than inheriting an unrelated slider value.
  return <FigureForConcept key={id} concept={concept} compact={compact} interactive={interactive} />;
}
