import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'providers/payment_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/add_child_screen.dart';
import 'screens/history_screen.dart';
import 'screens/payment_screen.dart';
import 'screens/receipt_screen.dart';
import 'models/payment.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => PaymentProvider()),
      ],
      child: const MyApp(),
    ),
  );
}

final GoRouter _router = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/add-child',
      builder: (context, state) => const AddChildScreen(),
    ),
    GoRoute(
      path: '/history',
      builder: (context, state) => const HistoryScreen(),
    ),
    GoRoute(
      path: '/payment',
      builder: (context, state) {
        final childId = state.uri.queryParameters['childId'];
        return PaymentScreen(initialChildId: childId);
      },
    ),
    GoRoute(
      path: '/receipt',
      builder: (context, state) {
        final payment = state.extra as Payment;
        return ReceiptScreen(payment: payment);
      },
    ),
  ],
);

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'PayKal',
      routerConfig: _router,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0D47A1), // Professional Blue
          primary: const Color(0xFF0D47A1),
          onPrimary: Colors.white,
          surface: Colors.white,
          onSurface: const Color(0xFF0D47A1),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0D47A1),
          foregroundColor: Colors.white,
        ),
      ),
      debugShowCheckedModeBanner: false,
    );
  }
}
