#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node* left;
    struct Node* right;
} Node;

Node* create_node(int val) {
    Node* node = (Node*)malloc(sizeof(Node));
    node->value = val;
    node->left = NULL;
    node->right = NULL;
    return node;
}

Node* insert(Node* root, int val) {
    if (root == NULL) {
        return create_node(val);
    }
    
    if (val < root->value) {
        root->left = insert(root->left, val);
    } else {
        root->right = insert(root->right, val);
    }
    return root;
}

void free_tree(Node* root) {
    if (root == NULL) return;
    free_tree(root->left);
    free_tree(root->right);
    free(root);
}

int count_nodes(Node* root) {
    if (root == NULL) return 0;
    return 1 + count_nodes(root->left) + count_nodes(root->right);
}

int main() {
    Node* root = NULL;
    long long seed = 12345;
    int count = 100000;
    
    for (int i = 0; i < count; i++) {
        seed = (seed * 1664525 + 1013904223) % 2147483647;
        if (seed < 0) seed = -seed;
        
        root = insert(root, (int)seed);
    }
    
    int nodes = count_nodes(root);
    printf("Tree nodes: %d\n", nodes);
    
    free_tree(root);
    return 0;
}
