export function LoadingState({ label }: { label: string }) {
  return <div className="loading-state" role="status"><span className="loading-notch" aria-hidden="true" /><span>{label}</span></div>;
}
