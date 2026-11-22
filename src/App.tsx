import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { OnboardingFlow } from './components/OnboardingFlow';
import { PlanScreen } from './components/PlanScreen';
import { GroceryScreen } from './components/GroceryScreen';
import { FridgeScanScreen } from './components/FridgeScanScreen';
import { CookbookScreen } from './components/CookbookScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { RecipeDetailScreen } from './components/RecipeDetailScreen';
import { CookModeScreen } from './components/CookModeScreen';
import {
  ActionSheetsAndToast,
  DesktopSidebar,
  MobileBottomNav,
  type ActiveSheetType,
} from './components/NavigationAndSheets';

const SofrehShell: React.FC = () => {
  const {
    onboarded,
    activeTab,
    selectedRecipeId,
    cookModeRecipeId,
  } = useAppState();

  const [activeSheet, setActiveSheet] = useState<ActiveSheetType>(null);

  if (!onboarded) {
    return <OnboardingFlow />;
  }

  return (
    <div className="min-h-dvh w-full ambient-canvas text-[#292B25] flex">
      {/* Desktop RTL Liquid Glass Sidebar */}
      <DesktopSidebar onOpenSheet={setActiveSheet} />

      {/* Main Content Area — Full bleed when RecipeDetail is open so hero photo reaches top edge */}
      <main
        className={
          selectedRecipeId
            ? 'flex-1 min-w-0 w-full pb-28 lg:pb-12'
            : 'flex-1 min-w-0 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-32 lg:pb-12'
        }
      >
        <AnimatePresence mode="wait">
          {selectedRecipeId ? (
            <RecipeDetailScreen key={`recipe-${selectedRecipeId}`} />
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
            >
              {activeTab === 'plan' && (
                <PlanScreen
                  onOpenAddMeal={(dayIndex) =>
                    setActiveSheet({ type: 'add_meal', dayIndex })
                  }
                />
              )}
              {activeTab === 'shop' && (
                <GroceryScreen
                  onOpenAddGrocery={() => setActiveSheet({ type: 'add_grocery' })}
                />
              )}
              {activeTab === 'scan' && <FridgeScanScreen />}
              {activeTab === 'book' && (
                <CookbookScreen
                  onOpenImportRecipe={() => setActiveSheet({ type: 'import_recipe' })}
                />
              )}
              {activeTab === 'me' && <ProfileScreen />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Locked Floating Liquid Glass Bottom Nav & FAB */}
      {!cookModeRecipeId && !selectedRecipeId && (
        <MobileBottomNav onOpenSheet={setActiveSheet} />
      )}

      {/* Bottom Sheets & Undo Toast */}
      <ActionSheetsAndToast
        activeSheet={activeSheet}
        setActiveSheet={setActiveSheet}
      />

      {/* Full-Screen Distraction-Free Cook Mode */}
      <AnimatePresence>
        {cookModeRecipeId && <CookModeScreen key={`cook-${cookModeRecipeId}`} />}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AppStateProvider>
      <SofrehShell />
    </AppStateProvider>
  );
}
