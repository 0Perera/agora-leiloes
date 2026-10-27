const steps = [
  {
    title: 'Deposite saldo',
    text: 'Adicione saldo simulado à carteira. Enquanto seu lance lidera, o valor fica comprometido; se for superado, volta na hora.',
  },
  {
    title: 'Dê seu lance',
    text: 'O primeiro lance parte do valor inicial; os seguintes precisam somar o aumento mínimo. Tudo atualiza ao vivo, sem recarregar.',
  },
  {
    title: 'Arremate',
    text: 'Quando a contagem termina, o maior lance vence e recebe um comprovante de arremate com link para compartilhar.',
  },
  {
    title: 'Audite',
    text: 'Todo lote tem um histórico público de lances que qualquer pessoa pode conferir, mesmo sem conta.',
  },
];

export function HowItWorks() {
  return (
    <section className="home-how on-dark" aria-labelledby="como-title">
      <div className="home-how__head">
        <h2 id="como-title" className="home-how__title">
          Como funciona
        </h2>
        <p className="home-how__lede">
          Quatro passos, do depósito ao comprovante.
        </p>
      </div>
      <div className="ag-meander ag-meander--light home-how__meander" />
      <ol className="home-how__steps">
        {steps.map((step, index) => (
          <li key={step.title} className="home-how__step">
            <span className="home-how__number" aria-hidden="true">
              {index + 1}
            </span>
            <h3 className="home-how__step-title">{step.title}</h3>
            <p className="home-how__text">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
