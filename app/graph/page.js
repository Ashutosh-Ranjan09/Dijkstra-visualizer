"use client";
import dynamic from "next/dynamic";

const GraphDijkstra = dynamic(() => import("../../components/GraphDijkstra"), {
  ssr: false,
});

export default function GraphPage() {
  return (
    <main className="w-[100%] h-[100%] flex flex-col items-center justify-start gap-1 p-1 bg-gray-100 dark:bg-gray-900">
      <h1
        className="w-[100%] h-[5%] text-center font-bold text-gray-800 dark:text-gray-200 shadow-md rounded-lg p-4 mb-4 dark:border-blue-800 overflow-x-hidden flex justify-center items-center"
        style={{ fontSize: "clamp(1.2rem, 2vw, 2rem)" }}
      >
        Graph-based Dijkstra Visualizer
      </h1>
      <section className="w-[100%] h-[95%] flex items-center justify-center p-1  dark:bg-gray-800 rounded-lg shadow-lg">
        <GraphDijkstra />
      </section>
    </main>
  );
}
