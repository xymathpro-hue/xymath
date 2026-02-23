async function salvarAluno() {
  if (!formData.nome_completo.trim()) {
    alert('⚠️ Digite o nome do aluno')
    return
  }

  try {
    if (editando) {
      // EDITAR
      const response = await fetch(`/api/alunos/${editando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Erro ao editar')
      alert('✅ Aluno atualizado!')
    } else {
      // ADICIONAR
      const response = await fetch('/api/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turmaId,
          ...formData
        })
      })

      if (response.status === 409) {
        alert('⚠️ Este aluno já pertence a esta turma!')
        return
      }

      if (!response.ok) throw new Error('Erro ao adicionar')
      alert('✅ Aluno adicionado!')
    }

    setShowModal(false)
    setEditando(null)
    setFormData({ nome_completo: '', tem_laudo: false, observacoes: '' })
    carregarAlunos()
  } catch (err) {
    alert(`❌ Erro ao ${editando ? 'editar' : 'adicionar'} aluno`)
    console.error(err)
  }
}
