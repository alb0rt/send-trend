import { Navbar } from './Navbar';
import Container from './Container';

export default function Layout({ children }) {
  return (
    <div>
      <Navbar />
      <div className="pt-16"> {/* Add padding top to account for fixed navbar */}
        <Container>
          {children}
        </Container>
      </div>
    </div>
  );
} 