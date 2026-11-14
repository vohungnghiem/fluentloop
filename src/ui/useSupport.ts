import { useLiveQuery } from 'dexie-react-hooks';
import { getPlan, supportFor } from '../services/plan';

/** Whether this learner gets the extra help (see `supportFor`); undefined while the plan loads. */
export function useSupport(): boolean | undefined {
  const plan = useLiveQuery(getPlan, [], null);
  return plan === null ? undefined : supportFor(plan?.level);
}
