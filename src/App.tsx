import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
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
import { ChefChatSheet } from './components/ChefChatSheet';
import { SubscriptionSheet } from './components/SubscriptionSheet';
import type { Recipe } from './types/sofreh';
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
    registerBackHandler,
    handleBackNavigation,
    showToast,
  } = useAppState();

  const [activeSheet, setActiveSheet] = useState<ActiveSheetType>(null);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [chefChatState, setChefChatState] = useState<{
    open: boolean;
    recipe?: Recipe | null;
    servings?: number;
  }>({ open: false, recipe: null });

  const lastBackExitAttemptRef = useRef<number>(0);

  const openChefChat = useCallback((recipe?: Recipe | null, servings?: number) => {
    setChefChatState({ open: true, recipe: recipe ?? null, servings });
  }, []);

  const closeChefChat = useCallback(() => {
    setChefChatState((prev) => ({ ...prev, open: false }));
  }, []);

  // Register root action sheets so hardware Back closes them before anything beneath
  useEffect(() => {
    if (!activeSheet) return;
    return registerBackHandler('root-action-sheet', () => {
      setActiveSheet(null);
      return true;
    });
  }, [activeSheet, registerBackHandler]);

  // Android Hardware Back Button (@capacitor/app) + Web Browser History Back Support
  useEffect(() => {
    const onSystemBack = () => {
      const handled = handleBackNavigation();
      if (handled) return;

      if (Capacitor.isNativePlatform()) {
        const now = Date.now();
        if (now - lastBackExitAttemptRef.current < 2100) {
          CapApp.exitApp();
        } else {
          lastBackExitAttemptRef.current = now;
          showToast('برای خروج دوباره بازگشت را بزنید');
        }
      }
    };

    let removeCapListener: (() => void) | null = null;
    if (Capacitor.isNativePlatform()) {
      const listenerPromise = CapApp.addListener('backButton', () => {
        onSystemBack();
      });
      removeCapListener = () => {
        listenerPromise.then((h) => h.remove()).catch(() => {});
      };
    }

    const pushSentinel = () => {
      try {
        window.history.pushState({ sofrehGuard: true }, '');
      } catch {
        // Ignore history restrictions in sandboxed iframes
      }
    };
    pushSentinel();

    const onPopState = () => {
      const handled = handleBackNavigation();
      if (handled) {
        pushSentinel();
      }
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      removeCapListener?.();
      window.removeEventListener('popstate', onPopState);
    };
  }, [handleBackNavigation, showToast]);

  if (!onboarded) {
    return <OnboardingFlow />;
  }

  return (
    <div className="min-h-dvh w-full ambient-canvas text-[#292B25] flex">
      {/* Desktop RTL Liquid Glass Sidebar */}
      <DesktopSidebar
        onOpenSheet={setActiveSheet}
        onOpenChefChat={() => openChefChat(null)}
        onOpenSubscription={() => setSubscriptionOpen(true)}
      />

      {/* Main Content Area */}
      <main
        className={
          selectedRecipeId
            ? 'flex-1 min-w-0 w-full pb-28 lg:pb-12'
            : 'flex-1 min-w-0 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-32 lg:pb-12'
        }
      >
        <AnimatePresence mode="wait">
          {selectedRecipeId ? (
            <RecipeDetailScreen
              key={`recipe-${selectedRecipeId}`}
              onAskChef={(recipe, servings) => openChefChat(recipe, servings)}
            />
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.13, ease: 'easeOut' }}
            >
              {activeTab === 'plan' && (
                <PlanScreen
                  onOpenAddMeal={(dayIndex) =>
                    setActiveSheet({ type: 'add_meal', dayIndex })
                  }
                  onOpenSubscription={() => setSubscriptionOpen(true)}
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
              {activeTab === 'me' && (
                <ProfileScreen onOpenChefChat={() => openChefChat(null)} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Locked Floating Liquid Glass Bottom Nav */}
      {!cookModeRecipeId && !selectedRecipeId && (
        <MobileBottomNav onOpenSheet={setActiveSheet} />
      )}

      {/* Bottom Sheets & Undo Toast */}
      <ActionSheetsAndToast
        activeSheet={activeSheet}
        setActiveSheet={setActiveSheet}
        onOpenChefChat={() => openChefChat(null)}
      />

      {/* Subscription Modal */}
      <SubscriptionSheet
        open={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
      />

      {/* Multi-Turn Gemini AI Chef Chatbot */}
      <ChefChatSheet
        open={chefChatState.open}
        activeRecipe={chefChatState.recipe}
        activeServings={chefChatState.servings}
        onClose={closeChefChat}
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
