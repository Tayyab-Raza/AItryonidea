import "./styles.css";

export const metadata = {
  title: "Trendzila AI Try On",
  description: "Mobile AI try-on prototype for Trendzila"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
