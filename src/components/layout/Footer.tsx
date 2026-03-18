import styles from './Footer.module.scss';

export default function Footer() {
  return (
    <>
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} <span>Juyeon Lee</span>. All rights reserved.</p>
      </footer>
    </>
  );
}