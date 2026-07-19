import { AgentBrain } from './types';
import { HeuristicBrain } from './heuristicBrain';
import { ClaudeBrain } from './claudeBrain';

// Factory (not a singleton) so tests can stub it and so a key added to the
// environment is picked up per call. With no ANTHROPIC_API_KEY the demo runs
// fully offline on deterministic heuristics; with a key, Claude proposes
// classifications/summaries (and ClaudeBrain itself falls back to heuristics
// on any API error).
export function getBrain(): AgentBrain {
  if (process.env.ANTHROPIC_API_KEY) {
    return new ClaudeBrain();
  }
  return new HeuristicBrain();
}
