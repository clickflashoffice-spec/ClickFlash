import React, { createContext, useContext, useState, useEffect } from 'react';

interface RouterContextType {
  path: string;
  navigate: (to: string | number) => void;
  params: Record<string, string>;
  searchParams: URLSearchParams;
}

const RouterContext = createContext<RouterContextType>({
  path: '/',
  navigate: () => {},
  params: {},
  searchParams: new URLSearchParams(),
});

export const useRouter = () => useContext(RouterContext);
export const useNavigate = () => useContext(RouterContext).navigate;
export const useParams = <T extends Record<string, string> = Record<string, string>>() =>
  useContext(RouterContext).params as T;
export const useLocation = () => ({ pathname: useContext(RouterContext).path });
export const useSearchParams = (): [URLSearchParams, (params: URLSearchParams) => void] => {
  const { searchParams } = useContext(RouterContext);
  return [searchParams, () => {}];
};

export const BrowserRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [path, setPath] = useState(window.location.pathname || '/');

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string | number) => {
    if (typeof to === 'number') {
      window.history.go(to);
      return;
    }
    window.history.pushState({}, '', to);
    setPath(to.split('?')[0]);
  };

  const searchParams = new URLSearchParams(window.location.search);

  return (
    <RouterContext.Provider value={{ path, navigate, params: {}, searchParams }}>
      {children}
    </RouterContext.Provider>
  );
};

export const Routes: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { path } = useRouter();

  let matchedElement: React.ReactNode = null;
  let matchedParams: Record<string, string> = {};

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || matchedElement) return;

    const routePath = (child.props as any).path as string;
    const element = (child.props as any).element as React.ReactNode;

    if (routePath === '*' || routePath === path) {
      matchedElement = element;
      return;
    }

    // Match dynamic paths like /photo/:id and /photo/:id/edit
    const routeSegments = routePath.split('/').filter(Boolean);
    const pathSegments = path.split('/').filter(Boolean);

    if (routeSegments.length === pathSegments.length) {
      let isMatch = true;
      const params: Record<string, string> = {};

      for (let i = 0; i < routeSegments.length; i++) {
        if (routeSegments[i].startsWith(':')) {
          const paramName = routeSegments[i].slice(1);
          params[paramName] = pathSegments[i];
        } else if (routeSegments[i] !== pathSegments[i]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        matchedElement = element;
        matchedParams = params;
      }
    }
  });

  const { navigate, searchParams } = useRouter();

  return (
    <RouterContext.Provider value={{ path, navigate, params: matchedParams, searchParams }}>
      {matchedElement}
    </RouterContext.Provider>
  );
};

export const Route: React.FC<{ path: string; element: React.ReactNode }> = () => null;
export const Navigate: React.FC<{ to: string; replace?: boolean }> = ({ to }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to);
  }, [to, navigate]);
  return null;
};
