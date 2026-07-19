import { AgentBrain } from './types';
import { HeuristicBrain } from './heuristicBrain';

// Factory (not a singleton) so tests can stub it and so a key added to the
// environment is picked up per call. Falls back to the offline heuristic
// brain whenever no Anthropic API key is configured.
export function getBrain(): AgentBrain {
  return new HeuristicBrain();
}
