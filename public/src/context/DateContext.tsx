import React, { createContext, useContext, useState } from 'react';

interface DateContextType {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
}

const DateContext = createContext<DateContextType>({
  selectedDate: new Date().toISOString().split('T')[0],
  setSelectedDate: () => {},
});

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  return (
    <DateContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </DateContext.Provider>
  );
};

export const useSelectedDate = () => useContext(DateContext);