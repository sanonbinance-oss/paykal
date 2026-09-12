import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/payment_provider.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PayKal Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () => context.push('/history'),
          ),
        ],
      ),
      body: Consumer<PaymentProvider>(
        builder: (context, provider, child) {
          if (provider.children.isEmpty) {
            return const Center(
              child: Text('No children added yet.'),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16.0),
            itemCount: provider.children.length,
            itemBuilder: (context, index) {
              final child = provider.children[index];
              return Card(
                elevation: 4,
                margin: const EdgeInsets.only(bottom: 16),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    child: Text(
                      child.name[0].toUpperCase(),
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                  title: Text(
                    child.name,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text('${child.className} - ${child.schoolName}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    context.push('/payment?childId=${child.id}');
                  },
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/add-child'),
        tooltip: 'Add Child',
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 0,
        onTap: (index) {
          if (index == 1) {
            context.push('/history');
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history),
            label: 'History',
          ),
        ],
      ),
    );
  }
}
