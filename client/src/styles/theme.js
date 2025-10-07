// filepath: c:\Users\arsen\Desktop\Tecno\PR-1\campusfix\client\src\styles\theme.js
import { createTheme } from '@mui/material/styles';

// Создаем тему с кастомными цветами и настройками
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#4791db',
      dark: '#115293',
      contrastText: '#fff',
    },
    secondary: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
    success: {
      main: '#4caf50',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    priority: {
      'низкий': {
        main: '#2196f3', // синий
        light: '#e3f2fd',
        dark: '#1565c0',
        contrastText: '#fff'
      },
      'средний': {
        main: '#ff9800', // оранжевый
        light: '#fff3e0',
        dark: '#e65100',
        contrastText: '#fff'
      },
      'высокий': {
        main: '#f44336', // красный
        light: '#ffebee',
        dark: '#b71c1c',
        contrastText: '#fff'
      },
      'критический': {
        main: '#7b1fa2', // фиолетовый
        light: '#f3e5f5',
        dark: '#4a148c',
        contrastText: '#fff'
      }
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;