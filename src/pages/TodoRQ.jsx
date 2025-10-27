// TodoRQ.jsx
import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:4000";

const API = `${API_BASE_URL}/api/todos`;

// ---- API 함수 ----
const fetchTodos = async (signal) => {
  const res = await fetch(`${API}`, { signal });
  if (!res.ok) throw new Error("GET /api/todos 실패");
  const data = await res.json();
  // 백엔드가 { items, ... } 형태이므로 items 우선 사용
  // 혹시 배열로 바뀌어도 호환
  return Array.isArray(data) ? data : data.items || [];
};

const createTodo = async (payload) => {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("POST /api/todos 실패");
  return res.json();
};

const updateTodo = async ({ id, patch }) => {
  const res = await fetch(`${API}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("PATCH /api/todos 실패");
  return res.json();
};

const deleteTodo = async (id) => {
  const res = await fetch(`${API}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("DELETE /api/todos 실패");
  return true; // 204일 때도 true
};

// ---- 메인 화면 ----
function Todo() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  // READ
  // READ
  const {
    data: todos = [],
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["todos"],
    queryFn: ({ signal }) => fetchTodos(signal),
  });

  // CREATE (낙관적 업데이트)
  const addMutation = useMutation({
    mutationFn: (title) => createTodo({ title, completed: false }),
    onMutate: async (title) => {
      await qc.cancelQueries({ queryKey: ["todos"] });
      const prev = qc.getQueryData(["todos"]);

      const optimisticItem = {
        id: `tmp-${Date.now()}`,
        title,
        completed: false,
        // 서버 정렬 기준과 맞추기 위해 생성시각도 넣어두면 더 자연스러움
        createdAt: new Date().toISOString(),
      };

      // 맨 위에 추가
      const next = Array.isArray(prev)
        ? [optimisticItem, ...prev]
        : prev?.items
        ? { ...prev, items: [optimisticItem, ...prev.items] }
        : [optimisticItem];

      qc.setQueryData(["todos"], next);
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["todos"], ctx.prev);
    },
    onSuccess: (saved) => {
      // tmp-를 실제 저장값으로 교체(위치 유지)
      qc.setQueryData(["todos"], (old) => {
        if (Array.isArray(old)) {
          return old.map((t) => (String(t.id).startsWith("tmp-") ? saved : t));
        }
        if (old?.items) {
          return {
            ...old,
            items: old.items.map((t) =>
              String(t.id).startsWith("tmp-") ? saved : t
            ),
          };
        }
        return old;
      });
    },
    // 선택: 굳이 즉시 리패치 안 해도 되면 주석 처리 가능
    onSettled: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });

  // UPDATE 토글
  const toggleMutation = useMutation({
    mutationFn: ({ id, nextCompleted }) =>
      updateTodo({ id, patch: { completed: nextCompleted } }),
    onMutate: async ({ id, nextCompleted }) => {
      await qc.cancelQueries({ queryKey: ["todos"] });
      const prev = qc.getQueryData(["todos"]);
      qc.setQueryData(["todos"], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, completed: nextCompleted } : t))
      );
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["todos"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });

  // UPDATE 제목
  const editMutation = useMutation({
    mutationFn: ({ id, nextTitle }) =>
      updateTodo({ id, patch: { title: nextTitle } }),
    onMutate: async ({ id, nextTitle }) => {
      await qc.cancelQueries({ queryKey: ["todos"] });
      const prev = qc.getQueryData(["todos"]);
      qc.setQueryData(["todos"], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, title: nextTitle } : t))
      );
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["todos"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });

  // DELETE
  const delMutation = useMutation({
    mutationFn: (id) => deleteTodo(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["todos"] });
      const prev = qc.getQueryData(["todos"]);
      qc.setQueryData(["todos"], (old = []) => old.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["todos"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addMutation.mutate(title.trim());
    setTitle("");
  };

  const handleToggle = (todo) =>
    toggleMutation.mutate({ id: todo.id, nextCompleted: !todo.completed });

  const handleEdit = (todo) => {
    const next = window.prompt("수정할 제목", todo.title);
    if (next == null || !next.trim()) return;
    editMutation.mutate({ id: todo.id, nextTitle: next.trim() });
  };

  const handleDelete = (id) => {
    if (!confirm("정말 삭제할래?")) return;
    delMutation.mutate(id);
  };

  return (
    <div className="mx-auto mt-8 max-w-xl p-4">
      <h2 className="mb-4 text-xl font-semibold">Todo (React Query)</h2>

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

      {isPending && <div className="text-sm text-stone-500">불러오는 중…</div>}
      {isError && (
        <div className="mb-2 text-sm text-red-600">오류: {error.message}</div>
      )}

      <ul className="grid gap-2">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center gap-2 rounded-lg border border-stone-200 p-2"
          >
            <input
              type="checkbox"
              className="size-4"
              checked={!!todo.completed}
              onChange={() => handleToggle(todo)}
            />
            <span
              className={`flex-1 ${
                todo.completed ? "text-stone-400 line-through" : ""
              }`}
            >
              {todo.title}
            </span>
            <button
              onClick={() => handleEdit(todo)}
              className="rounded-md border border-stone-300 px-2 py-1 text-sm"
            >
              수정
            </button>
            <button
              onClick={() => handleDelete(todo.id)}
              className="rounded-md border border-red-400 px-2 py-1 text-sm text-red-600"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const qc = new QueryClient();
export default function TodoRQ() {
  return (
    <QueryClientProvider client={qc}>
      <Todo />
    </QueryClientProvider>
  );
}
