/* eslint-disable @next/next/no-html-link-for-pages, react/no-unescaped-entities */
export default function SuccessPage() {
  return (
    <html>
      <head>
        <title>Payment Successful - Soccer App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0fdf4 0%, #dbeafe 100%);
            min-height: 100vh;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 40px;
            text-align: center;
          }
          .emoji {
            font-size: 4rem;
            margin-bottom: 20px;
          }
          h1 {
            font-size: 2rem;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 16px;
          }
          .subtitle {
            font-size: 1.25rem;
            color: #6b7280;
            margin-bottom: 32px;
          }
          .details {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
            text-align: left;
          }
          .details h2 {
            font-size: 1.125rem;
            font-weight: 600;
            color: #166534;
            margin-bottom: 16px;
          }
          .detail-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            color: #374151;
          }
          .detail-icon {
            width: 20px;
            height: 20px;
            margin-right: 12px;
            color: #16a34a;
          }
          .button {
            display: inline-block;
            width: 100%;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            text-decoration: none;
            text-align: center;
            margin-bottom: 16px;
            transition: background-color 0.2s;
          }
          .button-primary {
            background: #2563eb;
            color: white;
          }
          .button-primary:hover {
            background: #1d4ed8;
          }
          .button-secondary {
            background: white;
            color: #374151;
            border: 1px solid #d1d5db;
          }
          .button-secondary:hover {
            background: #f9fafb;
          }
          .account-section {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .account-section h3 {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 8px;
          }
          .account-section p {
            color: #1e3a8a;
            font-size: 0.875rem;
            margin-bottom: 16px;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="card">
            <div className="emoji">🎉</div>
            <h1>Payment Successful!</h1>
            <p className="subtitle">Congratulations! You're now registered for the game.</p>

            <div className="details">
              <h2>Game Details</h2>
              <div className="detail-item">
                <div className="detail-icon">📅</div>
                <span>Game registration confirmed</span>
              </div>
              <div className="detail-item">
                <div className="detail-icon">📍</div>
                <span>Check your email for location details</span>
              </div>
              <div className="detail-item">
                <div className="detail-icon">👥</div>
                <span>You're now part of the team!</span>
              </div>
            </div>

            <a href="/games" className="button button-primary">
              View All Games
            </a>
            
            <div className="account-section">
              <h3>Create an Account</h3>
              <p>Track your game history and get faster checkout for future games.</p>
              <a href="/profile" className="button button-secondary">
                Create Account
              </a>
            </div>
            
            <a href="/" className="button button-secondary">
              Return to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}