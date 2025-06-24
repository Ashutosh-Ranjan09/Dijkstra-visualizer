"use client";
import dynamic from "next/dynamic";

const GraphDijkstra = dynamic(() => import("../../components/GraphDijkstra"), {
  ssr: false,
});

export default function GraphPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-blue-50 via-white to-purple-100 dark:from-gray-900 dark:via-gray-950 dark:to-blue-900 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
      <h1 className="text-3xl font-extrabold mb-6 text-blue-900 dark:text-blue-200 drop-shadow-lg">
        Graph-based Dijkstra Visualizer
      </h1>
      <section className="w-full max-w-5xl bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-xl p-4 border border-blue-200 dark:border-blue-800">
        <div className="mb-4 flex flex-wrap gap-4 items-center justify-center bg-blue-50 dark:bg-gray-800/80 p-4 rounded-lg border border-blue-100 dark:border-gray-700 shadow">
          {/* Controls will be rendered here by GraphDijkstra */}
        </div>
        <GraphDijkstra />
      </section>
    </main>
  );
}
