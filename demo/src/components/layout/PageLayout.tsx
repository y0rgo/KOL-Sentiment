interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {children}
    </div>
  );
};

export default PageLayout;
