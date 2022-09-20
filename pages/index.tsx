import type {NextPage} from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head'
import {useTheme, ThemeProvider} from '@mui/material/styles';
import styles from '../styles/Home.module.css';

const DynamicBaserowTable = dynamic(() => import('../components/baserowTable'), {
  ssr: false,
});

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Baserow Viewer</title>
        <meta name="description" content="Baserow Viewer" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ThemeProvider theme={useTheme()}>
        <main className={styles.main}>
          <DynamicBaserowTable />
        </main>
      </ThemeProvider>
    </div>
  );
};

export default Home;
