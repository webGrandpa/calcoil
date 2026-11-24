import { useEffect } from 'react';
import { AppProvider, useApp } from './app/context';
import { navigate, useRoute } from './app/router';
import type { Route } from './app/router';
import { CalcScreen } from './screens/CalcScreen';
import { CargoScreen } from './screens/CargoScreen';
import { JobScreen } from './screens/JobScreen';
import { JobsScreen } from './screens/JobsScreen';
import { ReportScreen } from './screens/ReportScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ShoreScreen } from './screens/ShoreScreen';
import { StageScreen } from './screens/StageScreen';
import { TankScreen } from './screens/TankScreen';
import { VesselScreen, VesselsScreen } from './screens/VesselsScreen';
import { TabBar } from './ui/AppBar';
import { UpdateBanner } from './ui/UpdateBanner';
import type { Tab } from './ui/AppBar';

const TAB_OF: Partial<Record<Route['name'], Tab>> = { jobs: 'jobs', vessels: 'vessels', calc: 'calc', settings: 'settings' };

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'jobs':
      return <JobsScreen />;
    case 'job':
      return <JobScreen route={route} id={route.id} />;
    case 'cargo':
      return <CargoScreen route={route} id={route.id} />;
    case 'stage':
      return <StageScreen route={route} id={route.id} stage={route.stage} />;
    case 'tank':
      return <TankScreen key={`${route.stage}/${route.tank}`} route={route} id={route.id} stage={route.stage} tank={route.tank} />;
    case 'shore':
      return <ShoreScreen route={route} id={route.id} />;
    case 'report':
      return <ReportScreen route={route} id={route.id} />;
    case 'vessels':
      return <VesselsScreen />;
    case 'vessel':
      return <VesselScreen route={route} id={route.id} />;
    case 'calc':
      return <CalcScreen />;
    case 'settings':
      return <SettingsScreen />;
  }
}

function Shell() {
  const route = useRoute();
  const { at } = useApp();
  const tab = TAB_OF[route.name];

  useEffect(() => {
    document.title = 'CalcOil';
  }, []);

  return (
    <div className={`app ${tab ? 'app--tabs' : ''}`} data-route={route.name}>
      <UpdateBanner />
      <Screen route={route} />
      {tab && (
        <TabBar
          active={tab}
          labels={{ jobs: at('tabJobs'), vessels: at('tabVessels'), calc: at('tabCalc'), settings: at('tabSettings') }}
          onGo={(t) => {
            if (t !== tab) navigate({ name: t }, { replace: true });
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
