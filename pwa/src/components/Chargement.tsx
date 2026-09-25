interface Props {
  texte?: string
}

export default function Chargement({ texte = 'Chargement…' }: Props) {
  return (
    <div className="chargement" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{texte}</p>
    </div>
  )
}
