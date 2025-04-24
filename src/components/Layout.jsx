import { Navbar } from './Navbar';

export default function Layout({ children }) {
  return (
    <div>
      <Navbar />
      <div className="pt-16"> {/* Add padding top to account for fixed navbar */}
        <div className="w-[512px] mx-auto px-4">
          {children}
        </div>
      </div>
    </div>
  );
} 