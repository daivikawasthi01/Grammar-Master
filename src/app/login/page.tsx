"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../register/register.module.scss";
import Link from "next/link";
import validator from "validator";
import axios from "axios";
import Nav from "../components/Nav";

const Login: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorServer, setErrorServer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorServer("");

    if (!validator.isEmail(email)) {
      setErrorServer("Please enter a valid email address");
      return;
    }

    if (validator.isEmpty(password)) {
      setErrorServer("Password is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post("/api/login", {
        email,
        password,
      });

      if (response.data.success) {
        router.push("/account");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        "Authentication failed. Please try again.";
      setErrorServer(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.register__main}>
      <Nav />
      <div className={styles.register__main__form}>
        <form onSubmit={handleFormSend}>
          <div className={styles.register__main__form__header}>
            <h2>Sign in</h2>
            <Link href="/register">I don't have an account</Link>
          </div>
          {errorServer && (
            <div className={styles.register__main__form__error}>
              <svg
                data-testid="x-mark"
                className={styles.register__main__form__error__svg}
                xmlns="http://www.w3.org/2000/svg"
                height="1em"
                viewBox="0 0 384 512"
              >
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
              </svg>
              {errorServer}
            </div>
          )}
          <input
            type="email"
            className={styles.register__main__form__input}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className={styles.register__main__form__input}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <button
            className={styles.register__main__form__btn}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
          <p className={styles.register__main__form__policy}>
            This site is protected by reCAPTCHA and the Google Privacy Policy
            and Terms of Service apply.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
