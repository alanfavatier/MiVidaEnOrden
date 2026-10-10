export type Route =
  | 'inicio'
  | 'habitos'
  | 'objetivos'
  | 'agenda'
  | 'finanzas'
  | 'ajustes';

export interface RouteProps {
  onNavigate: (route: Route) => void;
}
