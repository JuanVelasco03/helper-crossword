import { IndexedGrid } from "@/components/IndexedGrid";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Cuadrícula con índices
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Indica filas y columnas; cada casilla muestra su índice (arriba a la
        izquierda) y puedes escribir una letra. Usa las flechas del teclado para
        moverte entre celdas.
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Recomendaciones
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400">
          Ir agregando palabra por palabra, para ir sacando el correctAnswers de cada nivel, cuando ya estén todas las palabras. Ahí si se saca el crucigrama como tal.
      </p>
      <IndexedGrid />
    </main>
  );
}
