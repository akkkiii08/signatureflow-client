export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0f17" }}>
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="w-16 h-16 border-2 border-amber-400/20 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-2 border-transparent border-t-amber-400 rounded-full animate-spin" />
        </div>
        <p className="text-slate-400 font-medium tracking-wide">Loading SignatureFlow</p>
      </div>
    </div>
  );
}
