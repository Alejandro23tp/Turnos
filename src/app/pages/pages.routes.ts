import { Routes } from "@angular/router";

export const routes : Routes = [
    {
        path: '',
        loadComponent: () => import('../layout/layout.component'),
        children: [
            {
                path: '',
                loadComponent: () => import('./turnos/turnos.component')
            }
        
        ]
    }
];

export default routes