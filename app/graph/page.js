"use client";
import dynamic from "next/dynamic";

const GraphDijkstra = dynamic(() => import("../../components/GraphDijkstra"), {
  ssr: false,
});

export default function GraphPage() {
  return (
    <main className="w-screen h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
          Graph-based Dijkstra Visualizer
        </h1>
      </header>
      <section className="flex-1 min-h-0 p-2">
        <GraphDijkstra />
      </section>
    </main>
  );
}