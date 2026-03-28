import { DEFAULT_CURRENCY, CURRENCIES } from '@kharcha/shared';

export default function Home() {
  const currency = CURRENCIES[DEFAULT_CURRENCY];

  return (
    <main
      style={{ maxWidth: 600, margin: '100px auto', textAlign: 'center', fontFamily: 'system-ui' }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
        Kharcha ({'\u0916\u0930\u094D\u091A\u093E'})
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#666' }}>
        Expense splitting &amp; tracking &mdash; coming soon.
      </p>
      <p style={{ marginTop: '2rem', color: '#999' }}>
        Default currency: {currency.symbol} {currency.name}
      </p>
    </main>
  );
}
