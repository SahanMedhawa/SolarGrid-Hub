const TIMES = Array.from({ length: 24 }, (_, hours) => {
  const minutes = '00';
  const value = `${String(hours).padStart(2, '0')}:${minutes}`;
  const hour12 = hours % 12 || 12;
  const meridiem = hours < 12 ? 'AM' : 'PM';

  return { value, label: `${hour12}:${minutes} ${meridiem}` };
});

export default function SchedulePicker({ value, onChange }) {
  const [rawStart = '06:00', rawEnd = '18:00'] = (value || '06:00-18:00').split('-');
  const start = TIMES.some(time => time.value === rawStart) ? rawStart : '06:00';
  const validEndTimes = TIMES.filter(time => time.value > start);
  const end = validEndTimes.some(time => time.value === rawEnd)
    ? rawEnd
    : validEndTimes[validEndTimes.length - 1]?.value;

  function updateSchedule(nextStart, nextEnd) {
    const nextValidEndTimes = TIMES.filter(time => time.value > nextStart);
    const safeEnd = nextValidEndTimes.some(time => time.value === nextEnd)
      ? nextEnd
      : nextValidEndTimes[0]?.value;
    if (safeEnd) onChange(`${nextStart}-${safeEnd}`);
  }

  return (
    <div className="form-row">
      <div className="form-group">
        <label className="form-label">From</label>
        <select className="form-select" value={start} onChange={event => updateSchedule(event.target.value, end)}>
          {TIMES.slice(0, -1).map(time => (
            <option key={time.value} value={time.value}>{time.label}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">To</label>
        <select className="form-select" value={end} onChange={event => updateSchedule(start, event.target.value)}>
          {validEndTimes.map(time => (
            <option key={time.value} value={time.value}>{time.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
