import { Outlet } from "react-router-dom";
import { Link } from "react-router-dom";

export default function GlobalLayout() {
  return (
    <div className="flex flex-col min-h-dvh">
      <header className="border-b px-4 border-black py-4">
        <div className="flex space-x-4">
          <Link to="/">Todo</Link>
          <Link to="/todo-rq">TodoRQ</Link>
        </div>
      </header>
      <main className="grow">
        <Outlet />
      </main>
      <footer className="p-4 border-t border-black">footer</footer>
    </div>
  );
}
