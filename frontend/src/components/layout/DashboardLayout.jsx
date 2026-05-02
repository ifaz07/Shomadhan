import Sidebar from './Sidebar';
import FloatingShapes from '../FloatingShapes';

const DashboardLayout = ({ 
  children, 
  bgClass = "bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30",
  showShapes = false 
}) => {
  return (
    <div className={`flex h-screen relative overflow-hidden ${bgClass}`}>
      {showShapes && <FloatingShapes />}
      <Sidebar transparent={showShapes} />
      <main className="flex-1 lg:ml-0 relative z-10 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 min-h-full flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          <footer className="mt-12 pb-4 text-center opacity-20 pointer-events-none select-none">
            <p className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-500">
              Government of Bangladesh • Somadhan Official Portal
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
