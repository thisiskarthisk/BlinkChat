// import AsyncStorage from '@react-native-async-storage/async-storage';
// import React, {
//     createContext,
//     useContext,
//     useEffect,
//     useState,
// } from 'react';

// import {
//     ThemeColors,
//     ThemeName,
//     Themes,
// } from '../constants/theme';

// import { useAuth } from './useAuth';

// interface ThemeContextType {
//   colors: ThemeColors;

//   isDark: boolean;

//   themeName: ThemeName;

//   setTheme: (
//     name: ThemeName
//   ) => Promise<void>;
// }

// const ThemeContext =
//   createContext<
//     ThemeContextType | undefined
//   >(undefined);

// const STORAGE_PREFIX =
//   'blinkchat_theme_';

// export function ThemeProvider({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const { user } = useAuth();

//   const [themeName, setThemeName] =
//     useState<ThemeName>('minimal');

//   const getStorageKey = () => {
//     return user
//       ? `${STORAGE_PREFIX}${user.id}`
//       : `${STORAGE_PREFIX}guest`;
//   };

//   useEffect(() => {
//     loadTheme();
//   }, [user?.id]);

//   const loadTheme = async () => {
//     try {
//       const savedTheme =
//         await AsyncStorage.getItem(
//           getStorageKey()
//         );

//       if (
//         savedTheme &&
//         savedTheme in Themes
//       ) {
//         setThemeName(
//           savedTheme as ThemeName
//         );
//       } else {
//         setThemeName('minimal');
//       }
//     } catch (error) {
//       console.log(
//         'Theme Load Error:',
//         error
//       );

//       setThemeName('minimal');
//     }
//   };

//   const setTheme = async (
//     name: ThemeName
//   ) => {
//     try {
//       setThemeName(name);

//       await AsyncStorage.setItem(
//         getStorageKey(),
//         name
//       );
//     } catch (error) {
//       console.log(
//         'Theme Save Error:',
//         error
//       );
//     }
//   };

//   const colors =
//     Themes[themeName];

//   const isDark =
//     colors.dark ?? false;

//   return (
//     <ThemeContext.Provider
//       value={{
//         colors,
//         isDark,
//         themeName,
//         setTheme,
//       }}
//     >
//       {children}
//     </ThemeContext.Provider>
//   );
// }

// export function useTheme() {
//   const context =
//     useContext(ThemeContext);

//   if (!context) {
//     throw new Error(
//       'useTheme must be used inside ThemeProvider'
//     );
//   }

//   return context;
// }




import React, {
  createContext
} from "react";

const ThemeContext =
  createContext<any>(null);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeContext.Provider
      value={{
        isDark: false,
        colors: {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return {
    isDark: false,
    colors: {},
  };
}