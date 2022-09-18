import Head from 'next/head'
import dynamic from 'next/dynamic'
import styles from '../styles/Home.module.css'
import {useTheme, ThemeProvider} from '@mui/material/styles';

const DynamicBaserowTable = dynamic(() => import('../components/baserowTable'), {
  ssr: false,
})

export default function Home() {
  const theme = useTheme();
  return (
    <div className={styles.container}>
      <Head>
        <title>Baserow Viewer</title>
        <meta name="description" content="Baserow Viewer" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ThemeProvider theme={theme}>
        <main className={styles.main}>
          <DynamicBaserowTable></DynamicBaserowTable>
        </main>
      </ThemeProvider>
    </div>
  )
}
