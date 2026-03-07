
import React from 'react';
import { EDL } from '../types/edl';
import { Timeline } from '../components/Timeline';

export const MainComposition: React.FC<{ edl: EDL }> = ({ edl }) => {
  return <Timeline edl={edl} />;
};
