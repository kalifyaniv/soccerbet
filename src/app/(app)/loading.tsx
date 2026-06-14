export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="flex flex-col items-center gap-2">
        <div className="soccer-ball-bounce">
          <span className="soccer-ball-spin text-7xl select-none leading-none">⚽</span>
        </div>
        <div className="soccer-ball-shadow w-12 h-2.5 rounded-full bg-gray-600" />
      </div>
      <p className="text-gray-500 text-sm tracking-widest">טוען...</p>
    </div>
  );
}
