import { useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:4000";

const API = `${API_BASE_URL}/api/todos`;

console.log("API", API);
export default function Todo() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");

  // READ
  useEffect(() => {
    (async () => {
      const res = await fetch(API, { cache: "no-store" });
      if (!res.ok) throw new Error("http Error");
      const data = await res.json();
      setTodos(data?.items ?? []);
    })();
  }, []);

  // CREATE
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), completed: false }),
    });
    if (!res.ok) return alert("추가 실패");
    const newItem = await res.json();
    setTodos((prev) => [newItem, ...prev]);
    setTitle("");
  };

  // UPDATE(완료 토글)
  const handleToggle = async (todo) => {
    const res = await fetch(`${API}/${todo.id}`, {
      method: "PATCH", // 서버가 PUT만 지원하면 "PUT"으로
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    console.log("handleToggle");
    if (!res.ok) return alert("업데이트 실패");
    const saved = await res.json();
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? saved : t)));
  };

  // UPDATE(제목 수정)
  const handleEdit = async (todo) => {
    const next = window.prompt("수정할 제목", todo.title);
    if (next == null || !next.trim()) return;
    const res = await fetch(`${API}/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next.trim() }),
    });
    if (!res.ok) return alert("수정 실패");
    const saved = await res.json();
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? saved : t)));
  };

  // DELETE
  const handleDelete = async (id) => {
    if (!confirm("정말 삭제?")) return;
    const res = await fetch(`${API}/${id}`, { method: "DELETE" });
    if (!res.ok) return alert("삭제 실패");
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="mx-auto mt-8 max-w-xl p-4">
      <h2 className="mb-4 text-xl font-semibold">Todo (fetch)</h2>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          className="flex-1 min-w-0  rounded-md border border-stone-300 px-2 py-2 outline-none focus:ring"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일 입력"
        />
        <button
          type="submit"
          className="rounded-md border border-stone-900 bg-stone-900 w-[80px] text-center py-2 text-white"
        >
          추가
        </button>
      </form>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id} className="flex py-2 gap-2">
            <input
              type="checkbox"
              checked={!!todo.completed}
              onChange={() => handleToggle(todo)}
            />
            <span className={`grow ${todo.completed ? "line-through" : ""}`}>
              {todo.title}
            </span>
            <button onClick={() => handleEdit(todo)}>수정</button>
            <button onClick={() => handleDelete(todo.id)}>삭제</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
