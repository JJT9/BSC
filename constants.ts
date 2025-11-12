
import { Perspective, PerspectiveKey } from './types';

export const PERSPECTIVES: Perspective[] = [
  {
    key: PerspectiveKey.FINANCIAL,
    label: 'Financiera',
    description: '¿Cómo deberíamos aparecer ante nuestros accionistas para tener éxito financiero?',
  },
  {
    key: PerspectiveKey.CUSTOMER,
    label: 'Cliente',
    description: 'Para alcanzar nuestra visión, ¿cómo deberíamos aparecer ante nuestros clientes?',
  },
  {
    key: PerspectiveKey.INTERNAL_PROCESS,
    label: 'Procesos Internos',
    description: 'Para satisfacer a nuestros accionistas y clientes, ¿en qué procesos de negocio debemos sobresalir?',
  },
  {
    key: PerspectiveKey.LEARNING_GROWTH,
    label: 'Aprendizaje y Crecimiento',
    description: 'Para alcanzar nuestra visión, ¿cómo mantendremos nuestra capacidad de cambiar y mejorar?',
  },
];
