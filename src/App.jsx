import { createBrowserRouter, RouterProvider } from "react-router-dom";
import GlobalLayout from "@/layouts/GlobalLayout";
import Todo from "@/pages/Todo";
import TodoRQ from "@/pages/TodoRQ";

const router = createBrowserRouter([
  {
    path: "/",
    element: <GlobalLayout />,
    children: [
      { index: true, element: <Todo /> },
      { path: "todo-rq", element: <TodoRQ /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
