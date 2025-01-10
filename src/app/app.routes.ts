import { Routes } from '@angular/router';

export const routes: Routes = [
        {
        path: 'pages',
        loadChildren: () => import('./pages/pages.routes').then(m => m.routes)
    },
    {
        path: '',
        redirectTo: 'pages',
        pathMatch: 'full'
    }
];
